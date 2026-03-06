"""
Animate photo flow — Photix Bot
Flow: Demo GIF intro → Upload photo → Motion prompt (or Auto) → Duration → Confirm → Generate
Note: Animation API not yet connected — shows placeholder
"""
import os
import logging
from aiogram import Router, F
from aiogram.types import CallbackQuery, Message, FSInputFile
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

ANIMATE_COSTS = {"3s": 2, "5s": 3, "10s": 5}
from bot.user_db import get_balance, deduct_tokens
from bot.utils import safe_edit_text, safe_delete, insufficient_tokens_text

router = Router()
logger = logging.getLogger(__name__)

DEMO_GIF_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "animate_demo.mp4")


class AnimateState(StatesGroup):
    waiting_photo = State()
    waiting_motion = State()
    choosing_duration = State()
    confirming = State()


# ── Step 0: Show demo GIF + intro ───────────────────────────

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
        "AI добавит плавное движение, анимацию\n"
        "и эффекты к статичному изображению.\n\n"
        "📸 <b>Отправь фото</b> (JPG/PNG, до 10 МБ):"
    )

    # Delete the current menu message (it's text-only)
    await safe_delete(callback.message)

    # Send demo video + intro
    try:
        video_file = FSInputFile(DEMO_GIF_PATH, filename="animate_demo.mp4")
        await callback.message.answer_video(
            video=video_file,
            caption=intro_text,
            parse_mode="HTML",
            reply_markup=builder.as_markup(),
        )
    except Exception as e:
        logger.warning("Could not send demo video: %s", e)
        # Fallback: text only
        await callback.message.answer(
            intro_text,
            parse_mode="HTML",
            reply_markup=builder.as_markup(),
        )

    await callback.answer()


# ── Step 1: Receive photo ───────────────────────────────────

@router.message(AnimateState.waiting_photo, F.photo)
async def receive_animate_photo(message: Message, state: FSMContext):
    photo = message.photo[-1]
    file = await message.bot.get_file(photo.file_id)
    token = message.bot.token
    input_url = f"https://api.telegram.org/file/bot{token}/{file.file_path}"

    await state.update_data(animate_photo_url=input_url)
    await safe_delete(message)

    # Show motion prompt step
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
        "Или нажми <b>Авто</b> для автоматического движения:",
        parse_mode="HTML",
        reply_markup=builder.as_markup(),
    )


@router.message(AnimateState.waiting_photo)
async def wrong_animate_input(message: Message):
    await message.answer("Пожалуйста, отправь фото (не файл).")


# ── Step 2: Motion prompt ───────────────────────────────────

@router.callback_query(F.data == "animmotion:auto")
async def auto_motion(callback: CallbackQuery, state: FSMContext):
    await state.update_data(motion_prompt="auto")
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


# ── Step 3: Duration selection ──────────────────────────────

async def _show_duration_selection(msg: Message, state: FSMContext):
    await state.set_state(AnimateState.choosing_duration)

    builder = InlineKeyboardBuilder()
    builder.button(text="3с (2💰)", callback_data="animdur:3s")
    builder.button(text="5с (3💰)", callback_data="animdur:5s")
    builder.button(text="10с (5💰)", callback_data="animdur:10s")
    builder.button(text="⬅ Назад", callback_data="flow:animate")
    builder.adjust(3, 1)

    try:
        await msg.edit_text(
            "⏱ <b>Длительность анимации</b>\n\n"
            "Выбери длительность:\n\n"
            "⚠️ 10с генерируется 3-5 мин",
            parse_mode="HTML",
            reply_markup=builder.as_markup(),
        )
    except Exception:
        await safe_delete(msg)
        await msg.answer(
            "⏱ <b>Длительность анимации</b>\n\n"
            "Выбери длительность:\n\n"
            "⚠️ 10с генерируется 3-5 мин",
            parse_mode="HTML",
            reply_markup=builder.as_markup(),
        )


# ── Step 4: Confirm ─────────────────────────────────────────

@router.callback_query(AnimateState.choosing_duration, F.data.startswith("animdur:"))
async def confirm_animate(callback: CallbackQuery, state: FSMContext):
    duration = callback.data.split(":", 1)[1]
    cost = ANIMATE_COSTS.get(duration, 3)
    await state.update_data(duration=duration, cost=cost)
    await state.set_state(AnimateState.confirming)

    data = await state.get_data()
    motion = data.get("motion_prompt", "auto")
    motion_display = "Автоматически" if motion == "auto" else motion[:100]

    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Оживить", callback_data="animgen:go")
    builder.button(text="❌ Отмена", callback_data="menu:main")
    builder.adjust(2)

    await safe_edit_text(
        callback.message,
        f"📋 <b>Подтверждение</b>\n\n"
        f"✨ Оживление фото\n"
        f"🎬 Движение: {motion_display}\n"
        f"⏱ Длительность: {duration.replace('s', ' сек')}\n"
        f"💰 Стоимость: <b>{cost}</b> токенов\n\n"
        f"Оживить?",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


# ── Step 5: Generate (placeholder) ──────────────────────────

@router.callback_query(F.data == "animgen:go")
async def generate_animate(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    cost = data.get("cost", 3)
    user_id = callback.from_user.id

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

    await state.clear()

    builder = InlineKeyboardBuilder()
    builder.button(text="🏠 Меню", callback_data="menu:main")
    builder.adjust(1)

    await safe_edit_text(
        callback.message,
        "🚧 <b>Анимация фото</b>\n\n"
        "Анимация фото будет доступна в ближайшем обновлении.\n"
        "Токены не были списаны.\n"
        "Следите за новостями!",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()
