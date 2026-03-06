"""
Photo generation via Discovery catalog — Photix Bot
Flow: Categories → Browse references (carousel) → Upload photo (optional) → Format → Confirm → Generate → Result
"""
import os
import asyncio
import logging

from aiogram import Router, F
from aiogram.types import CallbackQuery, Message, BufferedInputFile, FSInputFile
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.config import (
    get_display_name, get_emoji, CATEGORY_TO_GEN_MODEL,
    PHOTO_MODEL_COSTS, ASPECT_RATIOS, MIN_CATEGORY_POSTS,
)
from bot.user_db import get_or_create_user, get_balance, deduct_tokens
from bot.database import get_all_categories, get_categories_stats, get_random_post_by_category
from bot.utils import safe_edit_text, safe_delete, safe_edit_media, insufficient_tokens_text, compress_photo

router = Router()
logger = logging.getLogger(__name__)

MAX_BROWSE_RETRIES = 5  # Max attempts to find a post with a valid image
PROMO_PHOTO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "promo_photo.jpg")


class PhotoFlowState(StatesGroup):
    browsing = State()           # Browsing references
    waiting_photo = State()      # Waiting for user photo upload
    choosing_format = State()    # Choosing aspect ratio
    confirming = State()         # Confirmation screen


# ── Step 1: Categories ──────────────────────────────────────

def build_categories_keyboard():
    builder = InlineKeyboardBuilder()
    stats = get_categories_stats()
    categories = get_all_categories()
    shown = 0
    for cat in categories:
        count = stats.get(cat, 0)
        if count < MIN_CATEGORY_POSTS:
            continue  # Hide tiny categories
        emoji = get_emoji(cat)
        name = get_display_name(cat)
        builder.button(
            text=f"{emoji} {name} ({count})",
            callback_data=f"photocat:{cat}",
        )
        shown += 1
    builder.button(text="✍️ Свой промпт", callback_data="custprompt:start")
    builder.button(text="⬅ Назад", callback_data="menu:main")
    # 2 columns for categories
    rows = [2] * (shown // 2) + ([1] if shown % 2 else []) + [1, 1]
    builder.adjust(*rows)
    return builder.as_markup()


@router.callback_query(F.data == "flow:photo")
async def photo_categories(callback: CallbackQuery, state: FSMContext):
    await state.clear()

    intro_text = "🎨 <b>Создать фото</b>\n\nВыбери категорию:"
    keyboard = build_categories_keyboard()

    # Send promo image with categories
    try:
        await callback.message.delete()
    except Exception:
        pass

    try:
        promo = FSInputFile(PROMO_PHOTO_PATH, filename="promo_photo.jpg")
        await callback.message.answer_photo(
            photo=promo,
            caption=intro_text,
            parse_mode="HTML",
            reply_markup=keyboard,
        )
    except Exception as e:
        logger.warning("Could not send photo promo: %s", e)
        await callback.message.answer(
            intro_text,
            parse_mode="HTML",
            reply_markup=keyboard,
        )

    await callback.answer()


# ── Step 2: Browse references (carousel) ────────────────────

def build_reference_caption(post: dict, category: str) -> str:
    emoji = get_emoji(category)
    name = get_display_name(category)
    gen_model_key = CATEGORY_TO_GEN_MODEL.get(category, "seedream")
    model_info = PHOTO_MODEL_COSTS.get(gen_model_key, {"tokens": 1, "label": "AI", "time": "10-20с"})
    prompt_preview = (post.get("prompt") or "")[:100]
    if prompt_preview:
        prompt_preview = f"\n📝 <i>{prompt_preview}...</i>"

    return (
        f"{emoji} <b>{name}</b>{prompt_preview}\n\n"
        f"⏱ {model_info['time']}\n"
        f"💰 Стоимость: <b>{model_info['tokens']}</b> токенов"
    )


def build_reference_keyboard(category: str):
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Создать такое", callback_data=f"photoref:create:{category}")
    builder.button(text="➡ Следующее", callback_data=f"photocat:{category}")
    builder.button(text="⬅ Категории", callback_data="flow:photo")
    builder.adjust(2, 1)
    return builder.as_markup()


def _get_valid_post(category: str, max_retries: int = MAX_BROWSE_RETRIES):
    """Try to get a post with a valid result_image that's not too large.
    Returns (post, compressed_image_bytes) or (None, None)."""
    for _ in range(max_retries):
        post = get_random_post_by_category(category)
        if not post:
            return None, None
        result_image = post.get("result_image")
        if not result_image:
            continue
        image_bytes = bytes(result_image)
        if len(image_bytes) < 100:
            continue  # corrupt
        compressed = compress_photo(image_bytes)
        return post, compressed
    return None, None


@router.callback_query(F.data.startswith("photocat:"))
async def browse_reference(callback: CallbackQuery, state: FSMContext):
    category = callback.data.split(":", 1)[1]

    post, image_data = _get_valid_post(category)

    if not post:
        # No posts at all in this category
        builder = InlineKeyboardBuilder()
        builder.button(text="⬅ Категории", callback_data="flow:photo")
        builder.adjust(1)
        await safe_edit_text(
            callback.message,
            f"😔 В категории <b>{get_display_name(category)}</b> пока нет доступных фото.\n\nПопробуй другую категорию!",
            reply_markup=builder.as_markup(),
        )
        await callback.answer()
        return

    # Store current post in state
    await state.update_data(
        current_post_id=post["id"],
        current_category=category,
        current_prompt=post.get("prompt", ""),
    )
    await state.set_state(PhotoFlowState.browsing)

    caption = build_reference_caption(post, category)
    keyboard = build_reference_keyboard(category)

    if image_data:
        photo = BufferedInputFile(image_data, filename="reference.jpg")
        try:
            await safe_edit_media(
                callback.message, photo, caption, reply_markup=keyboard
            )
        except Exception as e:
            logger.warning("Failed to edit media, sending new message: %s", e)
            await safe_delete(callback.message)
            try:
                await callback.message.answer_photo(
                    photo=photo, caption=caption, parse_mode="HTML", reply_markup=keyboard
                )
            except Exception as e2:
                logger.error("Failed to send photo: %s", e2)
                # Fallback to text-only
                await callback.message.answer(
                    f"{caption}\n\n<i>(Не удалось загрузить изображение)</i>",
                    parse_mode="HTML",
                    reply_markup=keyboard,
                )
    else:
        # Post found but all images were corrupt/missing after retries
        builder = InlineKeyboardBuilder()
        builder.button(text="➡ Попробовать ещё", callback_data=f"photocat:{category}")
        builder.button(text="⬅ Категории", callback_data="flow:photo")
        builder.adjust(2)
        await safe_edit_text(
            callback.message,
            f"😔 Не удалось загрузить фото в <b>{get_display_name(category)}</b>.\n\nНажми «Попробовать ещё» или выбери другую категорию.",
            reply_markup=builder.as_markup(),
        )

    await callback.answer()


# ── Step 3: Upload photo (optional) ─────────────────────────

@router.callback_query(F.data.startswith("photoref:create:"))
async def ask_upload_photo(callback: CallbackQuery, state: FSMContext):
    category = callback.data.split(":")[-1]

    builder = InlineKeyboardBuilder()
    builder.button(text="⏩ Пропустить", callback_data="photoskip:upload")
    builder.button(text="⬅ Назад", callback_data=f"photocat:{category}")
    builder.adjust(2)

    await state.set_state(PhotoFlowState.waiting_photo)

    # Delete the photo message and send text
    await safe_delete(callback.message)
    await callback.message.answer(
        "📸 <b>Загрузи своё фото</b>\n\n"
        "Отправь фото как референс, или нажми <b>Пропустить</b> для генерации без референса.",
        parse_mode="HTML",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


@router.message(PhotoFlowState.waiting_photo, F.photo)
async def receive_user_photo(message: Message, state: FSMContext):
    # Get Telegram file URL for the uploaded photo
    photo = message.photo[-1]
    file = await message.bot.get_file(photo.file_id)
    token = message.bot.token
    input_url = f"https://api.telegram.org/file/bot{token}/{file.file_path}"

    await state.update_data(user_photo_url=input_url)
    await safe_delete(message)

    # Go to format selection
    await _show_format_selection(message, state)


@router.callback_query(F.data == "photoskip:upload")
async def skip_photo_upload(callback: CallbackQuery, state: FSMContext):
    await state.update_data(user_photo_url="")
    await _show_format_selection(callback.message, state)
    await callback.answer()


# ── Step 4: Format selection ────────────────────────────────

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
    category = data.get("current_category", "")
    name = get_display_name(category)
    emoji = get_emoji(category)
    gen_model_key = CATEGORY_TO_GEN_MODEL.get(category, "seedream")
    model_info = PHOTO_MODEL_COSTS.get(gen_model_key, {"tokens": 1, "label": "AI"})
    has_photo = bool(data.get("user_photo_url"))

    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Создать", callback_data="photogen:go")
    builder.button(text="❌ Отмена", callback_data="menu:main")
    builder.adjust(2)

    text = (
        f"📋 <b>Подтверждение</b>\n\n"
        f"{emoji} Стиль: <b>{name}</b>\n"
        f"📐 Формат: {ratio}\n"
        f"📸 Своё фото: {'Да' if has_photo else 'Нет'}\n"
        f"💰 Стоимость: <b>{model_info['tokens']}</b> токенов\n\n"
        f"Создать фото?"
    )

    await safe_edit_text(callback.message, text, reply_markup=builder.as_markup())
    await callback.answer()


# ── Step 5-6: Generation ────────────────────────────────────

@router.callback_query(F.data == "photogen:go")
async def start_generation(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    category = data.get("current_category", "")
    prompt = data.get("current_prompt", "")
    ratio = data.get("chosen_ratio", "1:1")
    user_photo_url = data.get("user_photo_url", "")
    user_id = callback.from_user.id

    gen_model_key = CATEGORY_TO_GEN_MODEL.get(category, "seedream")
    model_info = PHOTO_MODEL_COSTS.get(gen_model_key, {"tokens": 1, "label": "AI"})
    cost = model_info["tokens"]

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
        f"⏳ <b>Генерирую...</b> {model_info.get('time', '10-20с')}\n\n"
        f"Подожди, это занимает до 2 минут...",
    )
    await callback.answer()

    # Run generation
    await _run_photo_generation(
        progress_msg, gen_model_key, prompt, ratio, user_photo_url, new_balance
    )


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

        # Send result (results are NEVER deleted)
        builder = InlineKeyboardBuilder()
        builder.button(text="🔄 Похожее", callback_data="flow:photo")
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
