"""
Video generation via Discovery catalog — Photix Bot
Flow: Categories → Browse references → Duration → Format → Confirm → Generate
Note: Video generation API is not yet connected — shows placeholder message
"""
import logging
from aiogram import Router, F
from aiogram.types import CallbackQuery
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.config import VIDEO_CATEGORIES, VIDEO_MODEL_COSTS
from bot.user_db import get_balance
from bot.utils import safe_edit_text

router = Router()
logger = logging.getLogger(__name__)


class VideoFlowState(StatesGroup):
    choosing_category = State()
    browsing = State()
    choosing_duration = State()
    choosing_format = State()
    confirming = State()


# ── Step 1: Video categories ────────────────────────────────

def build_video_categories_kb():
    builder = InlineKeyboardBuilder()
    for cat_id, label in VIDEO_CATEGORIES:
        builder.button(text=label, callback_data=f"vidcat:{cat_id}")
    builder.button(text="✍️ Свой промпт", callback_data="vidcustom:start")
    builder.button(text="⬅ Назад", callback_data="menu:main")
    builder.adjust(2)
    return builder.as_markup()


@router.callback_query(F.data == "flow:video")
async def video_categories(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await safe_edit_text(
        callback.message,
        "🎬 <b>Создать видео</b>\n\nВыбери категорию:",
        reply_markup=build_video_categories_kb(),
    )
    await callback.answer()


# ── Step 2: Browse video references (placeholder) ───────────

@router.callback_query(F.data.startswith("vidcat:"))
async def browse_video_reference(callback: CallbackQuery, state: FSMContext):
    cat_id = callback.data.split(":", 1)[1]
    cat_label = dict(VIDEO_CATEGORIES).get(cat_id, cat_id)

    await state.update_data(video_category=cat_id)
    await state.set_state(VideoFlowState.browsing)

    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Создать такое", callback_data="vidref:create")
    builder.button(text="➡ Следующее", callback_data=f"vidcat:{cat_id}")
    builder.button(text="⬅ Категории", callback_data="flow:video")
    builder.adjust(2, 1)

    await safe_edit_text(
        callback.message,
        f"🎬 <b>{cat_label}</b>\n\n"
        f"🎥 Стиль: кинематографичное видео, плавное движение\n"
        f"🤖 Модель: Kling 3.0 | ⏱ 30-60с\n"
        f"💰 Стоимость: 5-12 токенов\n\n"
        f"<i>Превью видео-референсов будет доступно в следующем обновлении</i>",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


# ── Step 3: Duration ────────────────────────────────────────

@router.callback_query(F.data == "vidref:create")
async def choose_duration(callback: CallbackQuery, state: FSMContext):
    await state.set_state(VideoFlowState.choosing_duration)

    builder = InlineKeyboardBuilder()
    builder.button(text="5 сек (5💰)", callback_data="viddur:5s")
    builder.button(text="10 сек (8💰)", callback_data="viddur:10s")
    builder.button(text="15 сек (12💰)", callback_data="viddur:15s")
    builder.button(text="⬅ Назад", callback_data="flow:video")
    builder.adjust(3, 1)

    await safe_edit_text(
        callback.message,
        "⏱ <b>Выбери длительность:</b>\n\n"
        "⚠️ Видео >10 сек генерируется 3-5 мин",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


# ── Step 4: Format ──────────────────────────────────────────

@router.callback_query(VideoFlowState.choosing_duration, F.data.startswith("viddur:"))
async def choose_video_format(callback: CallbackQuery, state: FSMContext):
    duration = callback.data.split(":", 1)[1]
    await state.update_data(duration=duration)
    await state.set_state(VideoFlowState.choosing_format)

    builder = InlineKeyboardBuilder()
    builder.button(text="1:1", callback_data="vidfmt:1:1")
    builder.button(text="16:9", callback_data="vidfmt:16:9")
    builder.button(text="9:16", callback_data="vidfmt:9:16")
    builder.button(text="⬅ Назад", callback_data="vidref:create")
    builder.adjust(3, 1)

    await safe_edit_text(
        callback.message,
        "📐 <b>Выбери формат видео:</b>",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


# ── Step 5: Confirm ─────────────────────────────────────────

DURATION_COSTS = {"5s": 5, "10s": 8, "15s": 12}

@router.callback_query(VideoFlowState.choosing_format, F.data.startswith("vidfmt:"))
async def confirm_video(callback: CallbackQuery, state: FSMContext):
    fmt = callback.data.split(":", 1)[1]
    await state.update_data(format=fmt)
    await state.set_state(VideoFlowState.confirming)

    data = await state.get_data()
    duration = data.get("duration", "5s")
    cost = DURATION_COSTS.get(duration, 5)

    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Создать", callback_data="vidgen:go")
    builder.button(text="❌ Отмена", callback_data="menu:main")
    builder.adjust(2)

    await safe_edit_text(
        callback.message,
        f"📋 <b>Подтверждение</b>\n\n"
        f"🎬 Видео: Kling 3.0\n"
        f"⏱ Длительность: {duration.replace('s', ' сек')}\n"
        f"📐 Формат: {fmt}\n"
        f"💰 Стоимость: <b>{cost}</b> токенов\n\n"
        f"Создать видео?",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


# ── Step 6: Generate (placeholder) ──────────────────────────

@router.callback_query(F.data == "vidgen:go")
async def generate_video(callback: CallbackQuery, state: FSMContext):
    await state.clear()

    builder = InlineKeyboardBuilder()
    builder.button(text="🏠 Меню", callback_data="menu:main")
    builder.adjust(1)

    await safe_edit_text(
        callback.message,
        "🚧 <b>Видео-генерация</b>\n\n"
        "Генерация видео будет доступна в ближайшем обновлении.\n"
        "Следите за новостями!",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


# ── Custom video prompt ─────────────────────────────────────

@router.callback_query(F.data == "vidcustom:start")
async def video_custom_prompt(callback: CallbackQuery, state: FSMContext):
    # Redirect to duration selection directly
    await state.update_data(video_category="custom")
    await choose_duration(callback, state)
