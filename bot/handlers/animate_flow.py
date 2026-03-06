"""
Animate photo flow — Photix Bot
Flow: Demo video → Upload photo → Motion prompt → Duration → Confirm → Generate via kie.ai API
Uses bytedance/v1-pro-fast-image-to-video model
"""
import os
import asyncio
import json
import logging

import aiohttp
from aiogram import Router, F
from aiogram.types import CallbackQuery, Message, FSInputFile, URLInputFile
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.user_db import get_balance, deduct_tokens
from bot.utils import safe_edit_text, safe_delete, insufficient_tokens_text

router = Router()
logger = logging.getLogger(__name__)

DEMO_VIDEO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "animate_demo.mp4")

# API config
KIE_BASE_URL = "https://api.kie.ai/api/v1/jobs"
ANIMATE_MODEL = "bytedance/v1-pro-fast-image-to-video"
POLL_INTERVAL = 10
MAX_POLLS = 18  # 18 × 10s = 3 minutes

# Duration → (cost, api_duration_value)
DURATION_OPTIONS = {
    "5": {"label": "5 сек", "cost": 30, "api_val": "5"},
    "10": {"label": "10 сек", "cost": 60, "api_val": "10"},
}


class AnimateState(StatesGroup):
    waiting_photo = State()
    waiting_motion = State()
    choosing_duration = State()
    confirming = State()


def _get_api_key() -> str:
    key = os.getenv("KIE_API_KEY", "")
    if not key or key == "your_kie_api_key_here":
        raise ValueError("KIE_API_KEY не задан")
    return key


# ── Step 0: Show demo + intro ─────────────────────────────────

@router.callback_query(F.data == "flow:animate")
async def animate_start(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await state.set_state(AnimateState.waiting_photo)

    builder = InlineKeyboardBuilder()
    builder.button(text="⬅ Назад", callback_data="menu:main")
    builder.adjust(1)

    intro_text = (
        "✨ <b>Оживить фото</b>\n\n"
        "Превратим твоё фото в короткое видео!\n"
        "AI добавит плавное движение и анимацию.\n\n"
        "💰 5 сек — <b>30</b> токенов\n"
        "💰 10 сек — <b>60</b> токенов\n\n"
        "📸 <b>Отправь фото</b> (JPG/PNG, до 10 МБ):"
    )

    await safe_delete(callback.message)

    try:
        video_file = FSInputFile(DEMO_VIDEO_PATH, filename="animate_demo.mp4")
        await callback.message.answer_video(
            video=video_file,
            caption=intro_text,
            parse_mode="HTML",
            reply_markup=builder.as_markup(),
        )
    except Exception as e:
        logger.warning("Could not send demo video: %s", e)
        await callback.message.answer(
            intro_text,
            parse_mode="HTML",
            reply_markup=builder.as_markup(),
        )

    await callback.answer()


# ── Step 1: Receive photo ─────────────────────────────────────

@router.message(AnimateState.waiting_photo, F.photo)
async def receive_animate_photo(message: Message, state: FSMContext):
    photo = message.photo[-1]
    file = await message.bot.get_file(photo.file_id)
    token = message.bot.token
    input_url = f"https://api.telegram.org/file/bot{token}/{file.file_path}"

    await state.update_data(animate_photo_url=input_url)
    await safe_delete(message)

    await state.set_state(AnimateState.waiting_motion)

    builder = InlineKeyboardBuilder()
    builder.button(text="🤖 Авто", callback_data="animmotion:auto")
    builder.button(text="⬅ Назад", callback_data="flow:animate")
    builder.adjust(2)

    await message.answer(
        "🎬 <b>Описание движения</b>\n\n"
        "Опиши желаемое движение, например:\n"
        "• <i>плавный поворот головы</i>\n"
        "• <i>ветер развевает волосы</i>\n"
        "• <i>камера медленно приближается</i>\n\n"
        "Или нажми <b>Авто</b>:",
        parse_mode="HTML",
        reply_markup=builder.as_markup(),
    )


@router.message(AnimateState.waiting_photo)
async def wrong_animate_input(message: Message):
    await message.answer("Пожалуйста, отправь фото (не файл).")


# ── Step 2: Motion prompt ─────────────────────────────────────

@router.callback_query(F.data == "animmotion:auto")
async def auto_motion(callback: CallbackQuery, state: FSMContext):
    await state.update_data(motion_prompt="")
    await _show_duration_selection(callback.message, state)
    await callback.answer()


@router.message(AnimateState.waiting_motion)
async def receive_motion_prompt(message: Message, state: FSMContext):
    motion = (message.text or "").strip()
    if not motion:
        await message.answer("Опиши движение текстом или нажми Авто.")
        return

    await state.update_data(motion_prompt=motion)
    await safe_delete(message)
    await _show_duration_selection(message, state)


# ── Step 3: Duration ──────────────────────────────────────────

async def _show_duration_selection(msg: Message, state: FSMContext):
    await state.set_state(AnimateState.choosing_duration)

    builder = InlineKeyboardBuilder()
    builder.button(text="5 сек (30💰)", callback_data="animdur:5")
    builder.button(text="10 сек (60💰)", callback_data="animdur:10")
    builder.button(text="⬅ Назад", callback_data="flow:animate")
    builder.adjust(2, 1)

    try:
        await msg.edit_text(
            "⏱ <b>Длительность анимации:</b>",
            parse_mode="HTML",
            reply_markup=builder.as_markup(),
        )
    except Exception:
        await safe_delete(msg)
        await msg.answer(
            "⏱ <b>Длительность анимации:</b>",
            parse_mode="HTML",
            reply_markup=builder.as_markup(),
        )


# ── Step 4: Confirm ───────────────────────────────────────────

@router.callback_query(AnimateState.choosing_duration, F.data.startswith("animdur:"))
async def confirm_animate(callback: CallbackQuery, state: FSMContext):
    dur_key = callback.data.split(":", 1)[1]
    dur = DURATION_OPTIONS.get(dur_key, DURATION_OPTIONS["5"])
    await state.update_data(duration=dur_key, cost=dur["cost"])
    await state.set_state(AnimateState.confirming)

    data = await state.get_data()
    motion = data.get("motion_prompt", "")
    motion_display = motion[:100] if motion else "Автоматически"

    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Оживить", callback_data="animgen:go")
    builder.button(text="❌ Отмена", callback_data="menu:main")
    builder.adjust(2)

    await safe_edit_text(
        callback.message,
        f"📋 <b>Подтверждение</b>\n\n"
        f"✨ Оживление фото\n"
        f"🎬 Движение: {motion_display}\n"
        f"⏱ Длительность: {dur['label']}\n"
        f"💰 Стоимость: <b>{dur['cost']}</b> токенов\n\n"
        f"Оживить?",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


# ── Step 5: Generate ──────────────────────────────────────────

@router.callback_query(F.data == "animgen:go")
async def generate_animate(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    dur_key = data.get("duration", "5")
    dur = DURATION_OPTIONS.get(dur_key, DURATION_OPTIONS["5"])
    cost = dur["cost"]
    user_id = callback.from_user.id
    image_url = data.get("animate_photo_url", "")
    motion_prompt = data.get("motion_prompt", "")

    # Check balance
    balance = get_balance(user_id)
    if balance < cost:
        builder = InlineKeyboardBuilder()
        builder.button(text="💳 Пополнить", callback_data="purchase:menu")
        builder.button(text="🏠 Меню", callback_data="menu:main")
        builder.adjust(2)
        await safe_edit_text(
            callback.message,
            insufficient_tokens_text(cost, balance),
            reply_markup=builder.as_markup(),
        )
        await callback.answer()
        return

    # Deduct tokens
    if not deduct_tokens(user_id, cost):
        await callback.answer("Недостаточно токенов", show_alert=True)
        return

    await state.clear()
    new_balance = get_balance(user_id)

    progress_msg = await safe_edit_text(
        callback.message,
        f"⏳ <b>Оживляю фото...</b>\n\n"
        f"⏱ {dur['label']} | Это может занять до 3 минут...",
    )
    await callback.answer()

    # Build prompt
    if not motion_prompt:
        prompt = "Smooth cinematic motion, gentle camera movement, natural animation"
    else:
        prompt = motion_prompt

    await _run_animate(progress_msg, image_url, prompt, dur_key, new_balance)


async def _run_animate(progress_msg, image_url: str, prompt: str, duration: str, balance: int):
    """Call kie.ai V1 Pro Fast Image To Video API"""
    try:
        api_key = _get_api_key()
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": ANIMATE_MODEL,
            "input": {
                "prompt": prompt,
                "image_url": image_url,
                "resolution": "720p",
                "duration": duration,
            },
        }

        # Create task
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{KIE_BASE_URL}/createTask", json=payload, headers=headers
            ) as resp:
                data = await resp.json()

        if data.get("code") != 200:
            raise RuntimeError(f"API error: {data.get('msg')} (code {data.get('code')})")

        task_id = data["data"]["taskId"]

        # Poll for result
        async with aiohttp.ClientSession() as session:
            for _ in range(MAX_POLLS):
                await asyncio.sleep(POLL_INTERVAL)
                async with session.get(
                    f"{KIE_BASE_URL}/recordInfo",
                    params={"taskId": task_id},
                    headers={"Authorization": f"Bearer {api_key}"},
                ) as resp:
                    data = await resp.json()

                if data.get("code") != 200:
                    raise RuntimeError(f"Poll error: {data.get('msg')}")

                state = data["data"].get("state")
                if state == "success":
                    result = json.loads(data["data"]["resultJson"])
                    video_url = result["resultUrls"][0]

                    # Send video result
                    builder = InlineKeyboardBuilder()
                    builder.button(text="✨ Ещё анимация", callback_data="flow:animate")
                    builder.button(text="🎨 Создать фото", callback_data="flow:photo")
                    builder.button(text="💾 Скачать", url=video_url)
                    builder.button(text="🏠 Меню", callback_data="menu:main")
                    builder.adjust(2, 2)

                    await progress_msg.answer_video(
                        video=URLInputFile(video_url, filename="photix_animate.mp4"),
                        caption=f"✅ <b>Готово!</b>\n\n💰 Баланс: <b>{balance}</b> токенов",
                        parse_mode="HTML",
                        reply_markup=builder.as_markup(),
                    )
                    await safe_delete(progress_msg)
                    return

                elif state == "fail":
                    fail_msg = data["data"].get("failMsg", "неизвестная ошибка")
                    raise RuntimeError(f"Генерация завершилась ошибкой: {fail_msg}")

        raise TimeoutError("Генерация заняла слишком много времени.")

    except Exception as e:
        logger.exception("Animate generation error")
        builder = InlineKeyboardBuilder()
        builder.button(text="🔄 Попробовать снова", callback_data="flow:animate")
        builder.button(text="🏠 Меню", callback_data="menu:main")
        builder.adjust(1)
        try:
            await progress_msg.edit_text(
                f"❌ <b>Ошибка:</b> {e}",
                parse_mode="HTML",
                reply_markup=builder.as_markup(),
            )
        except Exception:
            pass
