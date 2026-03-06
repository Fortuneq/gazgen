"""
Custom prompt flow — "Свой промпт" advanced mode
Flow: Select model → Select format → Enter prompt → Confirm → Generate → Result
"""
import logging
from aiogram import Router, F
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.config import PHOTO_MODEL_COSTS, ASPECT_RATIOS
from bot.user_db import get_balance, deduct_tokens
from bot.utils import safe_edit_text, safe_delete, insufficient_tokens_text

router = Router()
logger = logging.getLogger(__name__)


class CustomPromptState(StatesGroup):
    choosing_model = State()
    choosing_format = State()
    entering_prompt = State()
    confirming = State()


# ── Step A: Choose model ─────────────────────────────────────

def build_model_keyboard():
    builder = InlineKeyboardBuilder()
    for key, info in PHOTO_MODEL_COSTS.items():
        if key == "gpt_img2img":
            continue  # skip img2img in custom prompt mode
        builder.button(
            text=f"{info['label']} ({info['tokens']}💰)",
            callback_data=f"custmodel:{key}",
        )
    builder.button(text="⬅ Назад", callback_data="flow:photo")
    builder.adjust(2)
    return builder.as_markup()


@router.callback_query(F.data == "custprompt:start")
async def custom_prompt_start(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await state.set_state(CustomPromptState.choosing_model)
    await safe_edit_text(
        callback.message,
        "✍️ <b>Свой промпт</b>\n\nВыбери модель для генерации:",
        reply_markup=build_model_keyboard(),
    )
    await callback.answer()


# ── Step B: Choose format ────────────────────────────────────

@router.callback_query(CustomPromptState.choosing_model, F.data.startswith("custmodel:"))
async def choose_model(callback: CallbackQuery, state: FSMContext):
    model_key = callback.data.split(":", 1)[1]
    if model_key not in PHOTO_MODEL_COSTS:
        await callback.answer("Неизвестная модель", show_alert=True)
        return

    await state.update_data(model_key=model_key)
    await state.set_state(CustomPromptState.choosing_format)

    builder = InlineKeyboardBuilder()
    for ratio in ASPECT_RATIOS:
        builder.button(text=ratio, callback_data=f"custfmt:{ratio}")
    builder.button(text="⬅ Назад", callback_data="custprompt:start")
    builder.adjust(3, 1)

    model_label = PHOTO_MODEL_COSTS[model_key]["label"]
    await safe_edit_text(
        callback.message,
        f"📐 <b>{model_label}</b>\n\nВыбери формат:",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


# ── Step C: Enter prompt ─────────────────────────────────────

@router.callback_query(CustomPromptState.choosing_format, F.data.startswith("custfmt:"))
async def choose_format(callback: CallbackQuery, state: FSMContext):
    ratio = callback.data.split(":", 1)[1]
    await state.update_data(ratio=ratio)
    await state.set_state(CustomPromptState.entering_prompt)

    await safe_edit_text(
        callback.message,
        "✍️ <b>Введи промпт</b>\n\n"
        "Опиши, что хочешь сгенерировать (на русском или английском):",
    )
    await callback.answer()


@router.message(CustomPromptState.entering_prompt)
async def receive_prompt(message: Message, state: FSMContext):
    prompt = (message.text or "").strip()
    if not prompt or len(prompt) < 3:
        await message.answer("Промпт слишком короткий. Опиши подробнее.")
        return

    await state.update_data(prompt=prompt)
    await state.set_state(CustomPromptState.confirming)

    # Delete user's message (clean chat)
    await safe_delete(message)

    data = await state.get_data()
    model_key = data["model_key"]
    ratio = data["ratio"]
    model_info = PHOTO_MODEL_COSTS[model_key]

    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Создать", callback_data="custgen:go")
    builder.button(text="❌ Отмена", callback_data="menu:main")
    builder.adjust(2)

    await message.answer(
        f"📋 <b>Подтверждение</b>\n\n"
        f"🤖 Модель: {model_info['label']}\n"
        f"📐 Формат: {ratio}\n"
        f"📝 Промпт: <i>{prompt[:200]}</i>\n"
        f"💰 Стоимость: <b>{model_info['tokens']}</b> токенов\n\n"
        f"Создать?",
        parse_mode="HTML",
        reply_markup=builder.as_markup(),
    )


# ── Step D: Generate ─────────────────────────────────────────

@router.callback_query(F.data == "custgen:go")
async def custom_generate(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    model_key = data.get("model_key", "seedream")
    ratio = data.get("ratio", "1:1")
    prompt = data.get("prompt", "")
    user_id = callback.from_user.id

    model_info = PHOTO_MODEL_COSTS.get(model_key, {"tokens": 1, "label": "AI"})
    cost = model_info["tokens"]

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

    if not deduct_tokens(user_id, cost):
        await callback.answer("Недостаточно токенов", show_alert=True)
        return

    await state.clear()
    new_balance = get_balance(user_id)

    progress_msg = await safe_edit_text(
        callback.message,
        f"⏳ <b>Генерирую...</b> {model_info.get('time', '10-20с')}\n\n"
        f"Модель: {model_info['label']}",
    )
    await callback.answer()

    # Reuse the photo flow generation
    from bot.handlers.photo_flow import _run_photo_generation
    await _run_photo_generation(progress_msg, model_key, prompt, ratio, "", new_balance)
