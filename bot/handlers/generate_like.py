"""
Генерация похожего изображения на основе понравившегося поста
Позволяет выбрать: использовать оригинальный промпт или изменить его
"""
import asyncio
import logging
import os
import io
import base64
from typing import List, Optional

import aiohttp
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, BufferedInputFile, URLInputFile
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.database import get_post_by_id, get_category_emoji, get_reference_images, check_and_deduct_credits

router = Router()
logger = logging.getLogger(__name__)

# API configurations
KIE_API_KEY = os.getenv("KIE_API_KEY", "***REMOVED***")
IMGBB_API_KEY = os.getenv("IMGBB_API_KEY", "***REMOVED***")
IMGBB_EXPIRATION = 600  # 10 minutes

KIE_GPT4O_URL = "https://api.kie.ai/api/v1/gpt4o-image"
IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload"

POLL_INTERVAL = 10   # секунд между проверками статуса
MAX_POLLS = 30       # максимум попыток (30 × 10 с = 5 минут)

# Маппинг категорий на модели kie.ai
CATEGORY_TO_MODEL = {
    "nano_banana_pro": "nano-banana-pro",
    "nano_banana_2": "nano-banana-pro",
    "nano_banana": "google/nano-banana",
    "nano_strawberry": "seedream/4.5-text-to-image",
    "nano_peach": "seedream/4.5-text-to-image",
    "nano_mango": "seedream/4.5-text-to-image",
    "nano_kiwi": "seedream/4.5-text-to-image",
    "nano_cherry": "seedream/4.5-text-to-image",
    "nano_lemon": "seedream/4.5-text-to-image",
    "nano_grape": "seedream/4.5-text-to-image",
    "nano_melon": "seedream/4.5-text-to-image",
    "nano_orange": "seedream/4.5-text-to-image",
    "nano_pineapple": "seedream/4.5-text-to-image",
}

# Reverse mapping: kie model_id → our model_key (for credit lookup)
_KIE_MODEL_TO_KEY = {
    "nano-banana-pro": "banana",
    "google/nano-banana": "nano_banana",
    "seedream/4.5-text-to-image": "seedream",
}


def _resolve_model_key(category: str) -> str:
    """Resolve category to our model_key for credit pricing."""
    category_lower = category.lower().replace(" ", "_")
    model_id = CATEGORY_TO_MODEL.get(category_lower, "nano-banana-pro")
    return _KIE_MODEL_TO_KEY.get(model_id, "banana")


def _insufficient_credits_keyboard():
    builder = InlineKeyboardBuilder()
    miniapp_url = os.getenv("MINIAPP_URL")
    if miniapp_url:
        from aiogram.types import WebAppInfo
        pricing_url = miniapp_url.rstrip("/") + "/subscription"
        builder.button(text="💰 Купить токены", web_app=WebAppInfo(url=pricing_url))
    builder.button(text="🏠 Главное меню", callback_data="menu:main")
    builder.adjust(1)
    return builder.as_markup()


class GenerateLikeState(StatesGroup):
    waiting_for_prompt_decision = State()
    waiting_for_custom_prompt = State()
    waiting_for_references_decision = State()
    waiting_for_reference_upload = State()


def build_prompt_decision_keyboard(post_id: int):
    """Клавиатура для выбора: использовать оригинальный промпт или изменить"""
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Использовать оригинальный", callback_data=f"genlike_prompt:original:{post_id}")
    builder.button(text="✏️ Изменить промпт", callback_data=f"genlike_prompt:custom:{post_id}")
    builder.button(text="🏠 В меню", callback_data="menu:main")
    builder.adjust(1)
    return builder.as_markup()


def build_references_decision_keyboard(post_id: int):
    """Клавиатура для выбора: использовать оригинальные референсы или загрузить свои"""
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Использовать оригинальные", callback_data=f"genlike_refs:original:{post_id}")
    builder.button(text="📤 Загрузить свои", callback_data=f"genlike_refs:custom:{post_id}")
    builder.button(text="🚫 Без референсов", callback_data=f"genlike_refs:none:{post_id}")
    builder.button(text="🏠 В меню", callback_data="menu:main")
    builder.adjust(1)
    return builder.as_markup()


def build_proceed_keyboard():
    """Клавиатура для продолжения после загрузки референсов"""
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Готово, генерировать", callback_data="genlike_refs:done")
    builder.button(text="🏠 В меню", callback_data="menu:main")
    builder.adjust(1)
    return builder.as_markup()


@router.callback_query(F.data.startswith("genlike:"))
async def start_generate_like(callback: CallbackQuery, state: FSMContext):
    """
    Начало процесса генерации похожего изображения
    Спрашиваем: использовать оригинальный промпт или изменить?
    """
    post_id = int(callback.data.split(":", 1)[1])

    # Получаем пост из БД
    post = get_post_by_id(post_id)
    if not post:
        await callback.answer("Пост не найден", show_alert=True)
        return

    category = post.get("category", "Unknown")
    emoji = get_category_emoji(category)
    prompt = post.get("prompt", "")

    if not prompt:
        await callback.message.answer(
            f"{emoji} <b>{category}</b>\n\n"
            "❌ У этого поста нет промпта для генерации.",
            parse_mode="HTML",
        )
        await callback.answer()
        return

    # Сохраняем данные поста в state
    await state.update_data(
        post_id=post_id,
        original_prompt=prompt,
        category=category,
    )

    # Показываем промпт в копируемом формате и спрашиваем, менять ли его
    prompt_display = prompt[:1000] + ("..." if len(prompt) > 1000 else "")

    await callback.message.answer(
        f"🎨 <b>Генерация похожего изображения</b>\n\n"
        f"{emoji} Категория: <b>{category}</b>\n\n"
        f"📝 <b>Оригинальный промпт:</b>\n"
        f"<code>{prompt_display}</code>\n\n"
        f"Хотите использовать этот промпт или изменить его?",
        parse_mode="HTML",
        reply_markup=build_prompt_decision_keyboard(post_id),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("genlike_prompt:original:"))
async def use_original_prompt(callback: CallbackQuery, state: FSMContext):
    """Пользователь выбрал использовать оригинальный промпт"""
    post_id = int(callback.data.split(":")[-1])

    data = await state.get_data()
    original_prompt = data.get("original_prompt", "")
    category = data.get("category", "Unknown")

    # Сохраняем выбор промпта
    await state.update_data(final_prompt=original_prompt)

    # Переходим к выбору референсов
    await _ask_about_references(callback.message, post_id, category, state)
    await callback.answer()


@router.callback_query(F.data.startswith("genlike_prompt:custom:"))
async def use_custom_prompt(callback: CallbackQuery, state: FSMContext):
    """Пользователь выбрал изменить промпт"""
    await state.set_state(GenerateLikeState.waiting_for_custom_prompt)

    data = await state.get_data()
    category = data.get("category", "Unknown")
    emoji = get_category_emoji(category)

    await callback.message.answer(
        f"{emoji} <b>Изменение промпта</b>\n\n"
        f"Отправьте новый промпт для генерации.\n"
        f"Можете скопировать оригинальный и изменить нужные части.",
        parse_mode="HTML",
    )
    await callback.answer()


@router.message(GenerateLikeState.waiting_for_custom_prompt)
async def receive_custom_prompt(message: Message, state: FSMContext):
    """Получаем кастомный промпт от пользователя"""
    custom_prompt = message.text.strip() if message.text else ""

    if not custom_prompt:
        await message.answer(
            "Пожалуйста, отправьте текстовый промпт.",
            reply_markup=InlineKeyboardBuilder()
            .button(text="🏠 В меню", callback_data="menu:main")
            .as_markup()
        )
        return

    if len(custom_prompt) < 3:
        await message.answer(
            "Промпт слишком короткий. Опишите подробнее.",
            reply_markup=InlineKeyboardBuilder()
            .button(text="🏠 В меню", callback_data="menu:main")
            .as_markup()
        )
        return

    # Сохраняем кастомный промпт
    await state.update_data(final_prompt=custom_prompt)

    data = await state.get_data()
    post_id = data.get("post_id")
    category = data.get("category", "Unknown")

    await message.answer(
        f"✅ Промпт сохранён!\n\n"
        f"<code>{custom_prompt[:500]}</code>",
        parse_mode="HTML",
    )

    # Переходим к выбору референсов
    await _ask_about_references(message, post_id, category, state)


async def _ask_about_references(message, post_id: int, category: str, state: FSMContext):
    """Спрашиваем о референсах"""
    emoji = get_category_emoji(category)

    # Проверяем, есть ли у поста оригинальные референсы
    reference_images = get_reference_images(post_id)
    refs_count = len(reference_images) if reference_images else 0

    refs_info = f"У оригинального поста есть {refs_count} референсов." if refs_count > 0 else "У оригинального поста нет референсов."

    await message.answer(
        f"{emoji} <b>Референсные изображения</b>\n\n"
        f"{refs_info}\n\n"
        f"Что использовать для генерации?",
        parse_mode="HTML",
        reply_markup=build_references_decision_keyboard(post_id),
    )


@router.callback_query(F.data.startswith("genlike_refs:original:"))
async def use_original_references(callback: CallbackQuery, state: FSMContext):
    """Использовать оригинальные референсы"""
    post_id = int(callback.data.split(":")[-1])

    # Получаем оригинальные референсы
    reference_images = get_reference_images(post_id)

    await state.update_data(
        reference_images=reference_images,
        use_original_refs=True,
    )

    refs_count = len(reference_images) if reference_images else 0
    await callback.message.answer(
        f"✅ Будут использованы {refs_count} оригинальных референсов",
        parse_mode="HTML",
    )

    # Переходим к генерации
    await _proceed_to_generation(callback.message, state, telegram_id=callback.from_user.id)
    await callback.answer()


@router.callback_query(F.data.startswith("genlike_refs:none:"))
async def use_no_references(callback: CallbackQuery, state: FSMContext):
    """Генерация без референсов"""
    await state.update_data(
        reference_images=[],
        use_original_refs=False,
    )

    await callback.message.answer("✅ Генерация будет без референсов", parse_mode="HTML")

    # Переходим к генерации
    await _proceed_to_generation(callback.message, state, telegram_id=callback.from_user.id)
    await callback.answer()


@router.callback_query(F.data.startswith("genlike_refs:custom:"))
async def upload_custom_references(callback: CallbackQuery, state: FSMContext):
    """Пользователь хочет загрузить свои referencer"""
    await state.set_state(GenerateLikeState.waiting_for_reference_upload)
    await state.update_data(custom_references=[])

    await callback.message.answer(
        "📤 <b>Загрузка референсов</b>\n\n"
        "Отправьте изображения-референсы (можно несколько).\n"
        "Когда закончите, нажмите <b>«Готово»</b>.",
        parse_mode="HTML",
        reply_markup=build_proceed_keyboard(),
    )
    await callback.answer()


@router.message(GenerateLikeState.waiting_for_reference_upload, F.photo)
async def receive_reference_photo(message: Message, state: FSMContext):
    """Получаем референсное изображение от пользователя"""
    # Получаем файл
    photo = message.photo[-1]
    file = await message.bot.get_file(photo.file_id)
    file_bytes = await message.bot.download_file(file.file_path)

    # Сохраняем в state
    data = await state.get_data()
    custom_refs = data.get("custom_references", [])
    custom_refs.append(file_bytes.read())
    await state.update_data(custom_references=custom_refs)

    await message.answer(
        f"✅ Референс {len(custom_refs)} добавлен\n\n"
        f"Отправьте ещё или нажмите <b>«Готово»</b>",
        parse_mode="HTML",
        reply_markup=build_proceed_keyboard(),
    )


@router.message(GenerateLikeState.waiting_for_reference_upload)
async def wrong_reference_format(message: Message):
    """Неправильный формат референса"""
    await message.answer(
        "Пожалуйста, отправьте изображение как фото (не файл).\n"
        "Или нажмите <b>«Готово»</b> для продолжения.",
        parse_mode="HTML",
        reply_markup=build_proceed_keyboard(),
    )


@router.callback_query(F.data == "genlike_refs:done")
async def finish_reference_upload(callback: CallbackQuery, state: FSMContext):
    """Завершение загрузки референсов"""
    data = await state.get_data()
    custom_refs = data.get("custom_references", [])

    await state.update_data(
        reference_images=custom_refs,
        use_original_refs=False,
    )

    await callback.message.answer(
        f"✅ Загружено {len(custom_refs)} референсов",
        parse_mode="HTML",
    )

    # Переходим к генерации
    await _proceed_to_generation(callback.message, state, telegram_id=callback.from_user.id)
    await callback.answer()


async def _upload_image_to_imgbb(image_bytes: bytes) -> Optional[str]:
    """Загружает изображение на imgbb и возвращает URL"""
    try:
        # Кодируем изображение в base64
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')

        async with aiohttp.ClientSession() as session:
            form_data = aiohttp.FormData()
            form_data.add_field('image', image_base64)

            params = {
                'key': IMGBB_API_KEY,
                'expiration': IMGBB_EXPIRATION
            }

            async with session.post(IMGBB_UPLOAD_URL, data=form_data, params=params) as resp:
                data = await resp.json()

                if data.get('success'):
                    return data['data']['url']
                else:
                    logger.error(f"ImgBB upload failed: {data}")
                    return None
    except Exception as e:
        logger.error(f"Error uploading to ImgBB: {e}")
        return None


async def _create_standard_task(
    model_id: str, prompt: str, reference_urls: List[str], aspect_ratio: str = "1:1"
) -> str:
    """Создаёт задачу генерации через standard API"""
    headers = {
        "Authorization": f"Bearer {KIE_API_KEY}",
        "Content-Type": "application/json",
    }

    input_data = {
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
    }

    # Добавляем референсы если есть
    if reference_urls:
        input_data["input_urls"] = reference_urls

    # Специфичные параметры для разных моделей
    if "nano-banana" in model_id.lower():
        input_data["resolution"] = "1K"
        input_data["output_format"] = "png"
    elif "seedream" in model_id.lower():
        input_data["quality"] = "basic"

    payload = {
        "model": model_id,
        "input": input_data
    }

    KIE_BASE_URL = "https://api.kie.ai/api/v1/jobs"

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{KIE_BASE_URL}/createTask", json=payload, headers=headers
        ) as resp:
            data = await resp.json()

    if data.get("code") != 200:
        raise RuntimeError(
            f"kie.ai createTask error: {data.get('msg')} (code {data.get('code')})"
        )
    return data["data"]["taskId"]


async def _poll_standard_task_status(task_id: str) -> str:
    """Ожидает выполнения задачи и возвращает URL результата"""
    headers = {"Authorization": f"Bearer {KIE_API_KEY}"}
    KIE_BASE_URL = "https://api.kie.ai/api/v1/jobs"

    async with aiohttp.ClientSession() as session:
        for attempt in range(MAX_POLLS):
            await asyncio.sleep(POLL_INTERVAL)

            async with session.get(
                f"{KIE_BASE_URL}/recordInfo",
                params={"taskId": task_id},
                headers=headers,
            ) as resp:
                data = await resp.json()

            if data.get("code") != 200:
                raise RuntimeError(f"kie.ai recordInfo error: {data.get('msg')}")

            task_state = data["data"].get("state")
            if task_state == "success":
                import json
                result = json.loads(data["data"]["resultJson"])
                return result["resultUrls"][0]
            elif task_state == "fail":
                fail_msg = data["data"].get("failMsg", "неизвестная ошибка")
                raise RuntimeError(f"Генерация завершилась ошибкой: {fail_msg}")

    raise TimeoutError("Генерация заняла слишком много времени. Попробуйте позже.")


async def _proceed_to_generation(message, state: FSMContext, telegram_id: int = None):
    """
    Начинаем генерацию изображения с использованием kie.ai API
    """
    data = await state.get_data()
    category = data.get("category", "Unknown")
    final_prompt = data.get("final_prompt", "")
    reference_images = data.get("reference_images", [])
    use_original_refs = data.get("use_original_refs", False)

    emoji = get_category_emoji(category)
    refs_count = len(reference_images) if reference_images else 0
    refs_source = "оригинальных" if use_original_refs else "загруженных"

    # Определяем модель для генерации
    category_lower = category.lower().replace(" ", "_")
    model_id = CATEGORY_TO_MODEL.get(category_lower, "nano-banana-pro")
    model_key = _resolve_model_key(category)

    logger.info(f"Category: {category}, Model: {model_id}, ModelKey: {model_key}")

    # Check and deduct credits
    if telegram_id:
        success, cost, remaining = check_and_deduct_credits(telegram_id, model_key)
        if not success:
            await state.clear()
            await message.answer(
                f"❌ <b>Недостаточно токенов</b>\n\n"
                f"Для генерации нужно <b>{cost}</b> токенов.\n"
                f"Ваш баланс: <b>{remaining}</b> токенов.\n\n"
                f"Пополните баланс в приложении 👇",
                parse_mode="HTML",
                reply_markup=_insufficient_credits_keyboard(),
            )
            return

    # Очищаем state
    await state.clear()

    # Показываем прогресс
    progress_msg = await message.answer(
        f"⏳ <b>Генерирую изображение...</b>\n\n"
        f"{emoji} Модель: <b>{category}</b>\n"
        f"📝 Промпт: <i>{final_prompt[:200]}</i>\n"
        f"🖼 Референсов: {refs_count} {refs_source if refs_count > 0 else ''}\n\n"
        f"Это может занять до 5 минут. Подождите...",
        parse_mode="HTML",
    )

    try:
        # 1. Загружаем референсы на imgbb (если есть)
        reference_urls = []
        if reference_images:
            await progress_msg.edit_text(
                f"⏳ <b>Загружаю референсы...</b>\n\n"
                f"Загружено: 0/{refs_count}",
                parse_mode="HTML"
            )

            for idx, img_bytes in enumerate(reference_images):
                url = await _upload_image_to_imgbb(img_bytes)
                if url:
                    reference_urls.append(url)
                    await progress_msg.edit_text(
                        f"⏳ <b>Загружаю referencer...</b>\n\n"
                        f"Загружено: {idx + 1}/{refs_count}",
                        parse_mode="HTML"
                    )

            logger.info(f"Uploaded {len(reference_urls)} references to imgbb: {reference_urls}")

        # 2. Создаём задачу генерации
        await progress_msg.edit_text(
            f"⏳ <b>Генерирую изображение...</b>\n\n"
            f"{emoji} {category}\n"
            f"📝 {final_prompt[:150]}...\n\n"
            f"Создание задачи...",
            parse_mode="HTML"
        )

        task_id = await _create_standard_task(model_id, final_prompt, reference_urls, "1:1")
        logger.info(f"Created generation task {task_id} for model {model_id}")

        # 3. Ожидаем результата
        await progress_msg.edit_text(
            f"⏳ <b>Генерирую изображение...</b>\n\n"
            f"{emoji} {category}\n"
            f"📝 {final_prompt[:150]}...\n\n"
            f"Ожидание результата (это может занять несколько минут)...",
            parse_mode="HTML"
        )

        result_url = await _poll_standard_task_status(task_id)
        logger.info(f"Generation completed: {result_url}")

        # 4. Отправляем результат
        await message.answer_photo(
            photo=URLInputFile(result_url, filename="generated.png"),
            caption=(
                f"✅ <b>Изображение готово!</b>\n\n"
                f"{emoji} Модель: <b>{category}</b>\n"
                f"📝 {final_prompt[:300]}\n"
                f"🖼 Референсов: {refs_count}"
            ),
            parse_mode="HTML",
            reply_markup=InlineKeyboardBuilder()
            .button(text="🎨 Сгенерировать ещё", callback_data="imggen:start")
            .button(text="🏠 Главное меню", callback_data="menu:main")
            .adjust(1)
            .as_markup()
        )
        await progress_msg.delete()

    except ValueError as e:
        await progress_msg.edit_text(
            f"⚙️ <b>Ошибка конфигурации:</b> {e}\n\n"
            "Проверьте настройки API ключей.",
            parse_mode="HTML",
            reply_markup=InlineKeyboardBuilder()
            .button(text="🏠 В меню", callback_data="menu:main")
            .as_markup()
        )
    except TimeoutError as e:
        await progress_msg.edit_text(
            str(e),
            reply_markup=InlineKeyboardBuilder()
            .button(text="🔄 Попробовать снова", callback_data="imggen:start")
            .button(text="🏠 В меню", callback_data="menu:main")
            .adjust(1)
            .as_markup()
        )
    except RuntimeError as e:
        logger.error("kie.ai error: %s", e)
        await progress_msg.edit_text(
            f"❌ <b>Ошибка генерации:</b> {e}",
            parse_mode="HTML",
            reply_markup=InlineKeyboardBuilder()
            .button(text="🏠 В меню", callback_data="menu:main")
            .as_markup()
        )
    except Exception as e:
        logger.exception("Unexpected error during image generation")
        await progress_msg.edit_text(
            f"❌ Произошла непредвиденная ошибка: {e}",
            reply_markup=InlineKeyboardBuilder()
            .button(text="🏠 В меню", callback_data="menu:main")
            .as_markup()
        )
