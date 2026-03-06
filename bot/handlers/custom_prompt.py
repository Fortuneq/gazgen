"""
Custom prompt flow — "Свой промпт" advanced mode with img2img support
Flow: Select model → Enter prompt → (Upload photo for img2img) → Choose format → Confirm → Generate → Result
"""
import logging
from aiogram import Router, F
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.handlers.photo_flow import PHOTO_MODELS, PHOTO_MODELS_MAP, ASPECT_RATIOS, _run_photo_generation
from bot.user_db import get_balance, deduct_tokens
from bot.utils import safe_edit_text, safe_delete, insufficient_tokens_text

router = Router()
logger = logging.getLogger(__name__)

# Add img2img model
IMG2IMG_MODEL = {"key": "gpt_img2img", "label": "GPT Img2Img", "cost": 19, "tier": "Pro", "time": "10-20с"}
ALL_MODELS = PHOTO_MODELS + [IMG2IMG_MODEL]
ALL_MODELS_MAP = {m["key"]: m for m in ALL_MODELS}


class CustomPromptState(StatesGroup):
    choosing_model = State()
    entering_prompt = State()
    waiting_photo = State()    # For img2img
    choosing_format = State()
    confirming = State()


# ── Step A: Choose model ─────────────────────────────────────

def build_model_keyboard():
    builder = InlineKeyboardBuilder()
    for m in ALL_MODELS:
        builder.button(
            text=f"{m['label']} ({m['cost']}💰)",
            callback_data=f"custmodel:{m['key']}",
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


# ── Step B: Enter prompt ──────────────────────────────────────

@router.callback_query(CustomPromptState.choosing_model, F.data.startswith("custmodel:"))
async def choose_model(callback: CallbackQuery, state: FSMContext):
    model_key = callback.data.split(":", 1)[1]
    model = ALL_MODELS_MAP.get(model_key)
    if not model:
        await callback.answer("Неизвестная модель", show_alert=True)
        return

    await state.update_data(model_key=model_key)
    await state.set_state(CustomPromptState.entering_prompt)

    builder = InlineKeyboardBuilder()
    builder.button(text="⬅ Назад", callback_data="custprompt:start")

    await safe_edit_text(
        callback.message,
        f"✍️ <b>{model['label']}</b> ({model['cost']}💰)\n\n"
        f"Введи промпт (на русском или английском):",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


@router.message(CustomPromptState.entering_prompt)
async def receive_prompt(message: Message, state: FSMContext):
    prompt = (message.text or "").strip()
    if not prompt or len(prompt) < 3:
        await message.answer("Промпт слишком короткий. Опиши подробнее.")
        return

    await state.update_data(prompt=prompt)
    await safe_delete(message)

    data = await state.get_data()
    model_key = data.get("model_key", "seedream")

    # If img2img model, ask for photo
    if model_key == "gpt_img2img":
        await state.set_state(CustomPromptState.waiting_photo)
        builder = InlineKeyboardBuilder()
        builder.button(text="⬅ Назад", callback_data="custprompt:start")
        await message.answer(
            "🖼 <b>Отправь исходное фото</b>\n\n"
            "GPT Img2Img преобразит твоё фото по промпту.",
            parse_mode="HTML",
            reply_markup=builder.as_markup(),
        )
    else:
        await _show_format(message, state)


# ── Step C: Photo for img2img ─────────────────────────────────

@router.message(CustomPromptState.waiting_photo, F.photo)
async def receive_photo(message: Message, state: FSMContext):
    photo = message.photo[-1]
    file = await message.bot.get_file(photo.file_id)
    token = message.bot.token
    url = f"https://api.telegram.org/file/bot{token}/{file.file_path}"
    await state.update_data(input_url=url)
    await safe_delete(message)
    await _show_format(message, state)


@router.message(CustomPromptState.waiting_photo)
async def wrong_photo(message: Message):
    await message.answer("Отправь фото (не файл).")


# ── Step D: Format ────────────────────────────────────────────

async def _show_format(msg: Message, state: FSMContext):
    await state.set_state(CustomPromptState.choosing_format)

    builder = InlineKeyboardBuilder()
    for ratio in ASPECT_RATIOS:
        builder.button(text=ratio, callback_data=f"custfmt:{ratio}")
    builder.button(text="⬅ Назад", callback_data="custprompt:start")
    builder.adjust(3, 1)

    await safe_edit_text(
        msg,
        "📐 <b>Выбери формат:</b>",
        reply_markup=builder.as_markup(),
    )


@router.callback_query(CustomPromptState.choosing_format, F.data.startswith("custfmt:"))
async def choose_format(callback: CallbackQuery, state: FSMContext):
    ratio = callback.data.split(":", 1)[1]
    await state.update_data(ratio=ratio)
    await state.set_state(CustomPromptState.confirming)

    data = await state.get_data()
    model_key = data["model_key"]
    model = ALL_MODELS_MAP.get(model_key, ALL_MODELS[0])
    prompt = data.get("prompt", "")
    has_photo = bool(data.get("input_url"))

    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Создать", callback_data="custgen:go")
    builder.button(text="❌ Отмена", callback_data="menu:main")
    builder.adjust(2)

    photo_line = f"\n📸 Своё фото: Да" if has_photo else ""

    await safe_edit_text(
        callback.message,
        f"📋 <b>Подтверждение</b>\n\n"
        f"🤖 Модель: <b>{model['label']}</b>\n"
        f"📐 Формат: {ratio}{photo_line}\n"
        f"📝 Промпт: <i>{prompt[:200]}</i>\n"
        f"💰 Стоимость: <b>{model['cost']}</b> токенов\n\n"
        f"Создать?",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


# ── Step E: Generate ──────────────────────────────────────────

@router.callback_query(F.data == "custgen:go")
async def custom_generate(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    model_key = data.get("model_key", "seedream")
    ratio = data.get("ratio", "1:1")
    prompt = data.get("prompt", "")
    input_url = data.get("input_url", "")
    user_id = callback.from_user.id

    model = ALL_MODELS_MAP.get(model_key, ALL_MODELS[0])
    cost = model["cost"]

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
        f"⏳ <b>Генерирую...</b> ~{model.get('time', '10-20с')}\n\n"
        f"🤖 {model['label']}",
    )
    await callback.answer()

    await _run_photo_generation(progress_msg, model_key, prompt, ratio, input_url, new_balance)
