"""
Photo generation — Photix Bot
Flow: Select model → Enter prompt → Choose format → Confirm → Generate → Result
"""
import os
import logging

from aiogram import Router, F
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.user_db import get_balance, deduct_tokens
from bot.utils import safe_edit_text, safe_delete, insufficient_tokens_text

router = Router()
logger = logging.getLogger(__name__)

# ── Photo models (synced with miniapp GeneratePage) ────────────
PHOTO_MODELS = [
    {"key": "nano_banana", "label": "Nano Banana", "cost": 9, "tier": "Standard", "time": "5-10с"},
    {"key": "seedream", "label": "Seedream 4.5", "cost": 9, "tier": "Standard", "time": "10-15с"},
    {"key": "seedream_v4", "label": "Seedream V4", "cost": 9, "tier": "Standard", "time": "10-20с"},
    {"key": "qwen", "label": "Qwen", "cost": 9, "tier": "Standard", "time": "10-15с"},
    {"key": "grok", "label": "Grok Imagine", "cost": 9, "tier": "Standard", "time": "10-15с"},
    {"key": "banana", "label": "Nano Banana Pro", "cost": 19, "tier": "Pro", "time": "5-10с"},
    {"key": "gpt_text", "label": "GPT Image 1.5", "cost": 19, "tier": "Pro", "time": "10-20с"},
    {"key": "gpt4o", "label": "GPT-4o Image", "cost": 35, "tier": "Ultra", "time": "10-20с"},
]

PHOTO_MODELS_MAP = {m["key"]: m for m in PHOTO_MODELS}

ASPECT_RATIOS = ["1:1", "16:9", "9:16"]


class PhotoFlowState(StatesGroup):
    choosing_model = State()
    waiting_prompt = State()
    waiting_photo = State()       # For img2img models
    choosing_format = State()
    confirming = State()


# ── Step 1: Model selection ───────────────────────────────────

def build_models_keyboard():
    builder = InlineKeyboardBuilder()
    for m in PHOTO_MODELS:
        builder.button(
            text=f"{m['label']} ({m['cost']}💰)",
            callback_data=f"photomodel:{m['key']}",
        )
    builder.button(text="⬅ Назад", callback_data="menu:main")
    builder.adjust(2)
    return builder.as_markup()


@router.callback_query(F.data == "flow:photo")
async def photo_select_model(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await state.set_state(PhotoFlowState.choosing_model)

    text = (
        "🎨 <b>Создать фото</b>\n\n"
        "Выбери модель:\n\n"
        "💰 Standard — 9 токенов\n"
        "⭐ Pro — 19 токенов\n"
        "👑 Ultra — 35 токенов"
    )

    try:
        await safe_edit_text(
            callback.message, text, reply_markup=build_models_keyboard()
        )
    except Exception:
        await safe_delete(callback.message)
        await callback.message.answer(text, parse_mode="HTML", reply_markup=build_models_keyboard())

    await callback.answer()


# ── Step 2: Prompt ────────────────────────────────────────────

@router.callback_query(F.data.startswith("photomodel:"))
async def photo_got_model(callback: CallbackQuery, state: FSMContext):
    model_key = callback.data.split(":", 1)[1]
    model = PHOTO_MODELS_MAP.get(model_key)
    if not model:
        await callback.answer("Неизвестная модель", show_alert=True)
        return

    await state.update_data(model_key=model_key)
    await state.set_state(PhotoFlowState.waiting_prompt)

    builder = InlineKeyboardBuilder()
    builder.button(text="⬅ Назад", callback_data="flow:photo")

    await safe_edit_text(
        callback.message,
        f"🎨 <b>{model['label']}</b> ({model['cost']}💰)\n\n"
        f"Опиши, что хочешь сгенерировать\n"
        f"(на русском или английском):",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


@router.message(PhotoFlowState.waiting_prompt)
async def photo_got_prompt(message: Message, state: FSMContext):
    prompt = (message.text or "").strip()
    if not prompt or len(prompt) < 3:
        await message.answer("Промпт слишком короткий. Опиши подробнее.")
        return

    await state.update_data(prompt=prompt)
    await safe_delete(message)

    await _show_format_selection(message, state)


# ── Step 3: Format selection ──────────────────────────────────

async def _show_format_selection(msg: Message, state: FSMContext):
    await state.set_state(PhotoFlowState.choosing_format)

    builder = InlineKeyboardBuilder()
    for ratio in ASPECT_RATIOS:
        builder.button(text=ratio, callback_data=f"photofmt:{ratio}")
    builder.button(text="⬅ Назад", callback_data="flow:photo")
    builder.adjust(3, 1)

    await safe_edit_text(
        msg,
        "📐 <b>Выбери формат:</b>",
        reply_markup=builder.as_markup(),
    )


@router.callback_query(PhotoFlowState.choosing_format, F.data.startswith("photofmt:"))
async def choose_format(callback: CallbackQuery, state: FSMContext):
    ratio = callback.data.split(":", 1)[1]
    await state.update_data(chosen_ratio=ratio)
    await state.set_state(PhotoFlowState.confirming)

    data = await state.get_data()
    model_key = data.get("model_key", "seedream")
    model = PHOTO_MODELS_MAP.get(model_key, PHOTO_MODELS[0])
    prompt = data.get("prompt", "")

    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Создать", callback_data="photogen:go")
    builder.button(text="❌ Отмена", callback_data="menu:main")
    builder.adjust(2)

    text = (
        f"📋 <b>Подтверждение</b>\n\n"
        f"🤖 Модель: <b>{model['label']}</b>\n"
        f"📐 Формат: {ratio}\n"
        f"📝 Промпт: <i>{prompt[:200]}</i>\n"
        f"💰 Стоимость: <b>{model['cost']}</b> токенов\n\n"
        f"Создать фото?"
    )

    await safe_edit_text(callback.message, text, reply_markup=builder.as_markup())
    await callback.answer()


# ── Step 4: Generate ──────────────────────────────────────────

@router.callback_query(F.data == "photogen:go")
async def start_generation(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    model_key = data.get("model_key", "seedream")
    prompt = data.get("prompt", "")
    ratio = data.get("chosen_ratio", "1:1")
    user_id = callback.from_user.id

    model = PHOTO_MODELS_MAP.get(model_key, PHOTO_MODELS[0])
    cost = model["cost"]

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

    # Show progress
    progress_msg = await safe_edit_text(
        callback.message,
        f"⏳ <b>Генерирую...</b> ~{model.get('time', '10-20с')}\n\n"
        f"🤖 {model['label']}\n"
        f"Подожди, это занимает до 2 минут...",
    )
    await callback.answer()

    # Run generation
    await _run_photo_generation(progress_msg, model_key, prompt, ratio, "", new_balance)


async def _run_photo_generation(progress_msg, model_key, prompt, ratio, input_url, balance):
    """Execute photo generation using kie.ai API"""
    from bot.handlers.image_gen import (
        MODELS, _create_standard_task, _poll_standard_task,
        _create_gpt4o_task, _poll_gpt4o_task,
    )
    from aiogram.types import URLInputFile

    if not prompt:
        prompt = "beautiful high quality image, professional photography"

    # Map model key
    if model_key not in MODELS:
        model_key = "seedream"

    cfg = MODELS[model_key]
    model_label = cfg["label"]

    # Resolve ratio value for API
    ratio_value = ratio
    if cfg.get("ratios"):
        for r in cfg["ratios"]:
            if isinstance(r, tuple):
                if r[0].startswith(ratio.split(":")[0]):
                    ratio_value = r[1]
                    break
            elif r == ratio:
                ratio_value = r
                break

    try:
        if cfg["api_type"] == "gpt4o":
            task_id = await _create_gpt4o_task(prompt, ratio_value, input_url)
            image_url = await _poll_gpt4o_task(task_id)
        else:
            task_id = await _create_standard_task(model_key, prompt, ratio_value, input_url)
            image_url = await _poll_standard_task(task_id)

        # Send result
        builder = InlineKeyboardBuilder()
        builder.button(text="🔄 Ещё фото", callback_data="flow:photo")
        builder.button(text="✨ Оживить", callback_data="flow:animate")
        builder.button(text="💾 Скачать HD", url=image_url)
        builder.button(text="🏠 Меню", callback_data="menu:main")
        builder.adjust(2, 2)

        await progress_msg.answer_photo(
            photo=URLInputFile(image_url, filename="photix_result.png"),
            caption=f"✅ <b>Готово!</b>\n\n💰 Баланс: <b>{balance}</b> токенов",
            parse_mode="HTML",
            reply_markup=builder.as_markup(),
        )
        await safe_delete(progress_msg)

    except Exception as e:
        logger.exception("Photo generation error")
        builder = InlineKeyboardBuilder()
        builder.button(text="🔄 Попробовать снова", callback_data="flow:photo")
        builder.button(text="🏠 Меню", callback_data="menu:main")
        builder.adjust(1)
        try:
            await progress_msg.edit_text(
                f"❌ <b>Ошибка генерации:</b> {e}",
                parse_mode="HTML",
                reply_markup=builder.as_markup(),
            )
        except Exception:
            pass
