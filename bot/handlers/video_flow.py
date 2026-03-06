"""
Video generation — Photix Bot
Flow: Select model → Enter prompt → Duration → Format → Confirm → Generate
Note: Video generation API not yet connected — shows placeholder
"""
import logging
from aiogram import Router, F
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.user_db import get_balance
from bot.utils import safe_edit_text, insufficient_tokens_text

router = Router()
logger = logging.getLogger(__name__)

# ── Video models (synced with miniapp CreateVideoPage) ─────────
VIDEO_MODELS = [
    {"key": "kling2.6", "label": "Kling 2.6", "cost": 5},
    {"key": "kling3.0", "label": "Kling 3.0", "cost": 7},
    {"key": "veo", "label": "Veo", "cost": 8},
    {"key": "sora", "label": "Sora", "cost": 10},
]

VIDEO_MODELS_MAP = {m["key"]: m for m in VIDEO_MODELS}

DURATIONS = ["5 сек", "10 сек", "15 сек"]
VIDEO_RATIOS = ["16:9", "9:16", "1:1"]


class VideoFlowState(StatesGroup):
    choosing_model = State()
    waiting_prompt = State()
    choosing_duration = State()
    choosing_format = State()
    confirming = State()


# ── Step 1: Model selection ───────────────────────────────────

def build_video_models_kb():
    builder = InlineKeyboardBuilder()
    for m in VIDEO_MODELS:
        builder.button(
            text=f"{m['label']} ({m['cost']}💰)",
            callback_data=f"vidmodel:{m['key']}",
        )
    builder.button(text="⬅ Назад", callback_data="menu:main")
    builder.adjust(2)
    return builder.as_markup()


@router.callback_query(F.data == "flow:video")
async def video_select_model(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await state.set_state(VideoFlowState.choosing_model)

    await safe_edit_text(
        callback.message,
        "🎬 <b>Создать видео</b>\n\n"
        "Выбери модель:",
        reply_markup=build_video_models_kb(),
    )
    await callback.answer()


# ── Step 2: Prompt ────────────────────────────────────────────

@router.callback_query(F.data.startswith("vidmodel:"))
async def video_got_model(callback: CallbackQuery, state: FSMContext):
    model_key = callback.data.split(":", 1)[1]
    model = VIDEO_MODELS_MAP.get(model_key)
    if not model:
        await callback.answer("Неизвестная модель", show_alert=True)
        return

    await state.update_data(model_key=model_key)
    await state.set_state(VideoFlowState.waiting_prompt)

    builder = InlineKeyboardBuilder()
    builder.button(text="⬅ Назад", callback_data="flow:video")

    await safe_edit_text(
        callback.message,
        f"🎬 <b>{model['label']}</b> ({model['cost']}💰)\n\n"
        f"Опиши, какое видео хочешь создать:",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


@router.message(VideoFlowState.waiting_prompt)
async def video_got_prompt(message: Message, state: FSMContext):
    prompt = (message.text or "").strip()
    if not prompt or len(prompt) < 3:
        await message.answer("Промпт слишком короткий. Опиши подробнее.")
        return

    await state.update_data(prompt=prompt)

    try:
        await message.delete()
    except Exception:
        pass

    # Go to duration selection
    await _show_duration(message, state)


# ── Step 3: Duration ──────────────────────────────────────────

async def _show_duration(msg: Message, state: FSMContext):
    await state.set_state(VideoFlowState.choosing_duration)

    builder = InlineKeyboardBuilder()
    builder.button(text="5 сек", callback_data="viddur:5")
    builder.button(text="10 сек", callback_data="viddur:10")
    builder.button(text="15 сек", callback_data="viddur:15")
    builder.button(text="⬅ Назад", callback_data="flow:video")
    builder.adjust(3, 1)

    await safe_edit_text(
        msg,
        "⏱ <b>Длительность видео:</b>\n\n"
        "⚠️ Видео >10 сек генерируется 3-5 мин",
        reply_markup=builder.as_markup(),
    )


@router.callback_query(VideoFlowState.choosing_duration, F.data.startswith("viddur:"))
async def video_got_duration(callback: CallbackQuery, state: FSMContext):
    duration = callback.data.split(":", 1)[1]
    await state.update_data(duration=duration)
    await state.set_state(VideoFlowState.choosing_format)

    builder = InlineKeyboardBuilder()
    for r in VIDEO_RATIOS:
        builder.button(text=r, callback_data=f"vidfmt:{r}")
    builder.button(text="⬅ Назад", callback_data="flow:video")
    builder.adjust(3, 1)

    await safe_edit_text(
        callback.message,
        "📐 <b>Формат видео:</b>",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


# ── Step 4: Confirm ───────────────────────────────────────────

@router.callback_query(VideoFlowState.choosing_format, F.data.startswith("vidfmt:"))
async def video_confirm(callback: CallbackQuery, state: FSMContext):
    fmt = callback.data.split(":", 1)[1]
    await state.update_data(format=fmt)
    await state.set_state(VideoFlowState.confirming)

    data = await state.get_data()
    model_key = data.get("model_key", "kling2.6")
    model = VIDEO_MODELS_MAP.get(model_key, VIDEO_MODELS[0])
    duration = data.get("duration", "5")
    prompt = data.get("prompt", "")

    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Создать", callback_data="vidgen:go")
    builder.button(text="❌ Отмена", callback_data="menu:main")
    builder.adjust(2)

    await safe_edit_text(
        callback.message,
        f"📋 <b>Подтверждение</b>\n\n"
        f"🎬 Модель: <b>{model['label']}</b>\n"
        f"⏱ Длительность: {duration} сек\n"
        f"📐 Формат: {fmt}\n"
        f"📝 Промпт: <i>{prompt[:200]}</i>\n"
        f"💰 Стоимость: <b>{model['cost']}</b> токенов\n\n"
        f"Создать видео?",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


# ── Step 5: Generate (placeholder) ────────────────────────────

@router.callback_query(F.data == "vidgen:go")
async def generate_video(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    model_key = data.get("model_key", "kling2.6")
    model = VIDEO_MODELS_MAP.get(model_key, VIDEO_MODELS[0])
    user_id = callback.from_user.id

    balance = get_balance(user_id)
    if balance < model["cost"]:
        builder = InlineKeyboardBuilder()
        builder.button(text="💳 Пополнить", callback_data="purchase:menu")
        builder.button(text="🏠 Меню", callback_data="menu:main")
        builder.adjust(2)
        await safe_edit_text(
            callback.message,
            insufficient_tokens_text(model["cost"], balance),
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
        "🚧 <b>Видео-генерация</b>\n\n"
        "Генерация видео будет доступна в ближайшем обновлении.\n"
        "Токены не были списаны.\n"
        "Следите за новостями!",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()
