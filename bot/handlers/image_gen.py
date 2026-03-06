"""
Хэндлер генерации изображений через kie.ai API
Поддерживаемые модели:
  - seedream/4.5-text-to-image            (text→image, standard API)
  - bytedance/seedream-v4-text-to-image   (text→image, standard API, image_size)
  - nano-banana-pro                       (text→image, standard API)
  - gpt-image/1.5-text-to-image           (text→image, standard API)
  - gpt-image/1.5-image-to-image          (image+text→image, standard API)
  - GPT-4o Image                          (text/image→image, отдельный API)
  - qwen/text-to-image                    (text→image, standard API, image_size)
  - grok-imagine/text-to-image            (text→image, standard API)
"""
import asyncio
import json
import logging
import os

import aiohttp
from aiogram import Router, F
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardMarkup,
    Message,
    URLInputFile,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.database import check_and_deduct_credits

router = Router()
logger = logging.getLogger(__name__)

KIE_BASE_URL = "https://api.kie.ai/api/v1/jobs"
KIE_GPT4O_URL = "https://api.kie.ai/api/v1/gpt4o-image"
POLL_INTERVAL = 10   # секунд между проверками статуса
MAX_POLLS = 12       # максимум попыток (12 × 10 с = 2 минуты)


class ImageGenState(StatesGroup):
    waiting_for_input_image = State()  # только для img2img
    waiting_for_prompt = State()
    waiting_for_ratio = State()


# ──────────────────────────────────────────────
# Вспомогательные функции для ratio-элементов
# ratio может быть str (label == value) или tuple (label, value)
# ──────────────────────────────────────────────

def _rl(r) -> str:
    """Отображаемое название."""
    return r[0] if isinstance(r, tuple) else r


def _rv(r) -> str:
    """API-значение."""
    return r[1] if isinstance(r, tuple) else r


# ──────────────────────────────────────────────
# Конфигурация моделей
# ──────────────────────────────────────────────

MODELS: dict[str, dict] = {
    "seedream": {
        "id": "seedream/4.5-text-to-image",
        "label": "Seedream 4.5",
        "type": "text2img",
        "api_type": "standard",
        "ratios": ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"],
        "ratio_cols": 4,
    },
    "seedream_v4": {
        "id": "bytedance/seedream-v4-text-to-image",
        "label": "Seedream V4",
        "type": "text2img",
        "api_type": "standard",
        "ratios": [
            ("1:1", "square"),
            ("1:1 HD", "square_hd"),
            ("3:4", "portrait_4_3"),
            ("2:3", "portrait_3_2"),
            ("9:16", "portrait_16_9"),
            ("4:3", "landscape_4_3"),
            ("3:2", "landscape_3_2"),
            ("16:9", "landscape_16_9"),
            ("21:9", "landscape_21_9"),
        ],
        "ratio_cols": 3,
    },
    "banana": {
        "id": "nano-banana-pro",
        "label": "Nano Banana Pro 🍌",
        "type": "text2img",
        "api_type": "standard",
        "ratios": ["1:1", "16:9", "9:16", "4:3", "3:4", "4:5", "5:4", "3:2", "2:3", "21:9", "auto"],
        "ratio_cols": 4,
    },
    "nano_banana": {
        "id": "google/nano-banana",
        "label": "Nano Banana 🍌",
        "type": "text2img",
        "api_type": "standard",
        "ratios": ["1:1", "16:9", "9:16", "4:3", "3:4", "5:4", "4:5", "3:2", "2:3", "21:9", "auto"],
        "ratio_cols": 4,
    },
    "gpt_text": {
        "id": "gpt-image/1.5-text-to-image",
        "label": "GPT Image 1.5",
        "type": "text2img",
        "api_type": "standard",
        "ratios": ["1:1", "2:3", "3:2"],
        "ratio_cols": 3,
    },
    "gpt_img2img": {
        "id": "gpt-image/1.5-image-to-image",
        "label": "GPT Image-to-Image 1.5",
        "type": "img2img",
        "api_type": "standard",
        "ratios": ["1:1", "2:3", "3:2"],
        "ratio_cols": 3,
    },
    "gpt4o": {
        "id": "gpt-image-1",
        "label": "GPT-4o Image",
        "type": "text2img",
        "api_type": "gpt4o",
        "ratios": ["1:1", "3:2", "2:3"],
        "ratio_cols": 3,
    },
    "qwen": {
        "id": "qwen/text-to-image",
        "label": "Qwen",
        "type": "text2img",
        "api_type": "standard",
        "ratios": [
            ("1:1", "square"),
            ("1:1 HD", "square_hd"),
            ("3:4", "portrait_4_3"),
            ("9:16", "portrait_16_9"),
            ("4:3", "landscape_4_3"),
            ("16:9", "landscape_16_9"),
        ],
        "ratio_cols": 3,
    },
    "grok": {
        "id": "grok-imagine/text-to-image",
        "label": "Grok Imagine",
        "type": "text2img",
        "api_type": "standard",
        "ratios": ["1:1", "3:2", "2:3", "9:16", "16:9"],
        "ratio_cols": 3,
    },
}


# ──────────────────────────────────────────────
# Payload builders
# ──────────────────────────────────────────────

def _build_standard_payload(
    model_key: str, prompt: str, ratio_value: str, input_url: str = ""
) -> dict:
    """Формирует тело запроса для /api/v1/jobs/createTask."""
    model_id = MODELS[model_key]["id"]

    input_data: dict
    if model_key == "seedream":
        input_data = {"prompt": prompt, "aspect_ratio": ratio_value, "quality": "basic"}
    elif model_key == "seedream_v4":
        input_data = {
            "prompt": prompt,
            "image_size": ratio_value,
            "image_resolution": "1K",
            "max_images": 1,
        }
    elif model_key == "banana":
        input_data = {
            "prompt": prompt,
            "aspect_ratio": ratio_value,
            "resolution": "1K",
            "output_format": "png",
        }
    elif model_key == "gpt_text":
        input_data = {"prompt": prompt, "aspect_ratio": ratio_value, "quality": "medium"}
    elif model_key == "gpt_img2img":
        input_data = {
            "input_urls": [input_url],
            "prompt": prompt,
            "aspect_ratio": ratio_value,
            "quality": "medium",
        }
    elif model_key == "nano_banana":
        input_data = {
            "prompt": prompt,
            "image_size": ratio_value,
            "output_format": "png",
        }
    elif model_key == "qwen":
        input_data = {
            "prompt": prompt,
            "image_size": ratio_value,
            "output_format": "png",
        }
    elif model_key == "grok":
        input_data = {"prompt": prompt, "aspect_ratio": ratio_value}
    else:
        input_data = {"prompt": prompt, "aspect_ratio": ratio_value}

    return {"model": model_id, "input": input_data}


def _build_gpt4o_payload(
    prompt: str, size: str, input_url: str = ""
) -> dict:
    """Формирует тело запроса для /api/v1/gpt4o-image/generate."""
    payload: dict = {"prompt": prompt, "size": size}
    if input_url:
        payload["filesUrl"] = [input_url]
    return payload


# ──────────────────────────────────────────────
# Keyboard helpers
# ──────────────────────────────────────────────

def _model_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for key, cfg in MODELS.items():
        builder.button(text=cfg["label"], callback_data=f"imggen:model:{key}")
    builder.button(text="❌ Отмена", callback_data="menu:main")
    builder.adjust(1)
    return builder.as_markup()


def _ratio_keyboard(model_key: str) -> InlineKeyboardMarkup:
    cfg = MODELS[model_key]
    builder = InlineKeyboardBuilder()
    for r in cfg["ratios"]:
        builder.button(text=_rl(r), callback_data=f"imggen:ratio:{_rv(r)}")
    builder.button(text="❌ Отмена", callback_data="menu:main")
    cols = cfg["ratio_cols"]
    n = len(cfg["ratios"])
    rows = [cols] * ((n + cols - 1) // cols)
    builder.adjust(*rows, 1)
    return builder.as_markup()


def _after_gen_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="🎨 Сгенерировать ещё", callback_data="imggen:start")
    builder.button(text="🏠 Главное меню", callback_data="menu:main")
    builder.adjust(1)
    return builder.as_markup()


def _insufficient_credits_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    miniapp_url = os.getenv("MINIAPP_URL")
    if miniapp_url:
        from aiogram.types import WebAppInfo
        pricing_url = miniapp_url.rstrip("/") + "/subscription"
        builder.button(text="💰 Купить токены", web_app=WebAppInfo(url=pricing_url))
    builder.button(text="🏠 Главное меню", callback_data="menu:main")
    builder.adjust(1)
    return builder.as_markup()


# ──────────────────────────────────────────────
# kie.ai helpers
# ──────────────────────────────────────────────

def _get_api_key() -> str:
    key = os.getenv("KIE_API_KEY", "")
    if not key or key == "your_kie_api_key_here":
        raise ValueError("KIE_API_KEY не задан в .env")
    return key


async def _get_telegram_file_url(message: Message) -> str:
    """Получает публичный URL фото из Telegram CDN."""
    photo = message.photo[-1]
    file = await message.bot.get_file(photo.file_id)
    token = message.bot.token
    return f"https://api.telegram.org/file/bot{token}/{file.file_path}"


async def _create_standard_task(
    model_key: str, prompt: str, ratio_value: str, input_url: str = ""
) -> str:
    headers = {
        "Authorization": f"Bearer {_get_api_key()}",
        "Content-Type": "application/json",
    }
    payload = _build_standard_payload(model_key, prompt, ratio_value, input_url)
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


async def _poll_standard_task(task_id: str) -> str:
    headers = {"Authorization": f"Bearer {_get_api_key()}"}
    async with aiohttp.ClientSession() as session:
        for _ in range(MAX_POLLS):
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
                result = json.loads(data["data"]["resultJson"])
                return result["resultUrls"][0]
            elif task_state == "fail":
                fail_msg = data["data"].get("failMsg", "неизвестная ошибка")
                raise RuntimeError(f"Генерация завершилась ошибкой: {fail_msg}")

    raise TimeoutError("Генерация заняла слишком много времени. Попробуйте позже.")


async def _create_gpt4o_task(
    prompt: str, size: str, input_url: str = ""
) -> str:
    headers = {
        "Authorization": f"Bearer {_get_api_key()}",
        "Content-Type": "application/json",
    }
    payload = _build_gpt4o_payload(prompt, size, input_url)
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{KIE_GPT4O_URL}/generate", json=payload, headers=headers
        ) as resp:
            data = await resp.json()
    if data.get("code") != 200:
        raise RuntimeError(
            f"4o image generate error: {data.get('msg')} (code {data.get('code')})"
        )
    return data["data"]["taskId"]


async def _poll_gpt4o_task(task_id: str) -> str:
    headers = {"Authorization": f"Bearer {_get_api_key()}"}
    async with aiohttp.ClientSession() as session:
        for _ in range(MAX_POLLS):
            await asyncio.sleep(POLL_INTERVAL)
            async with session.get(
                f"{KIE_GPT4O_URL}/record",
                params={"taskId": task_id},
                headers=headers,
            ) as resp:
                data = await resp.json()

            if data.get("code") not in (200, None):
                raise RuntimeError(f"4o image record error: {data.get('msg')}")

            task_data = data.get("data", {})
            info = task_data.get("info")
            if info and info.get("result_urls"):
                return info["result_urls"][0]

            # Явная ошибка
            if task_data.get("state") == "fail":
                raise RuntimeError(
                    f"Генерация завершилась ошибкой: {task_data.get('failMsg', 'неизвестная ошибка')}"
                )

    raise TimeoutError("Генерация заняла слишком много времени. Попробуйте позже.")


async def _run_generation(
    progress_msg,
    model_key: str,
    prompt: str,
    ratio_value: str,
    input_url: str = "",
) -> None:
    """Запускает задачу, ждёт результата и отправляет фото."""
    model_label = MODELS[model_key]["label"]
    try:
        cfg = MODELS[model_key]
        if cfg["api_type"] == "gpt4o":
            task_id = await _create_gpt4o_task(prompt, ratio_value, input_url)
            image_url = await _poll_gpt4o_task(task_id)
        else:
            task_id = await _create_standard_task(model_key, prompt, ratio_value, input_url)
            image_url = await _poll_standard_task(task_id)

        await progress_msg.answer_photo(
            photo=URLInputFile(image_url, filename="generated.png"),
            caption=(
                f"✅ <b>Изображение готово!</b>\n\n"
                f"🤖 {model_label}\n"
                f"📝 {prompt[:300]}\n"
                f"📐 {ratio_value}"
            ),
            parse_mode="HTML",
            reply_markup=_after_gen_keyboard(),
        )
        await progress_msg.delete()

    except ValueError as e:
        await progress_msg.edit_text(
            f"⚙️ <b>Ошибка конфигурации:</b> {e}\n\n"
            "Попросите администратора добавить KIE_API_KEY в настройки.",
            parse_mode="HTML",
            reply_markup=_after_gen_keyboard(),
        )
    except TimeoutError as e:
        await progress_msg.edit_text(str(e), reply_markup=_after_gen_keyboard())
    except RuntimeError as e:
        logger.error("kie.ai error: %s", e)
        await progress_msg.edit_text(
            f"❌ <b>Ошибка генерации:</b> {e}",
            parse_mode="HTML",
            reply_markup=_after_gen_keyboard(),
        )
    except Exception:
        logger.exception("Unexpected error during image generation")
        await progress_msg.edit_text(
            "❌ Произошла непредвиденная ошибка. Попробуйте позже.",
            reply_markup=_after_gen_keyboard(),
        )


# ──────────────────────────────────────────────
# Handlers
# ──────────────────────────────────────────────

@router.callback_query(F.data == "imggen:start")
async def imggen_start(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    text = (
        "🎨 <b>Генерация изображения</b>\n\n"
        "Выберите модель для генерации:"
    )
    try:
        await callback.message.edit_text(
            text, parse_mode="HTML", reply_markup=_model_keyboard(),
        )
    except Exception:
        await callback.message.answer(
            text, parse_mode="HTML", reply_markup=_model_keyboard(),
        )


@router.callback_query(F.data.startswith("imggen:model:"))
async def imggen_got_model(callback: CallbackQuery, state: FSMContext):
    model_key = callback.data.split("imggen:model:")[1]
    if model_key not in MODELS:
        await callback.answer("Неизвестная модель.", show_alert=True)
        return

    cfg = MODELS[model_key]
    await state.update_data(model_key=model_key)

    if cfg["type"] == "img2img":
        await state.set_state(ImageGenState.waiting_for_input_image)
        await callback.message.edit_text(
            f"🖼 <b>Генерация</b> · {cfg['label']}\n\n"
            "Отправьте исходное изображение (фото), которое нужно преобразовать:",
            parse_mode="HTML",
            reply_markup=InlineKeyboardBuilder()
            .button(text="❌ Отмена", callback_data="menu:main")
            .as_markup(),
        )
    else:
        await state.set_state(ImageGenState.waiting_for_prompt)
        await callback.message.edit_text(
            f"🎨 <b>Генерация</b> · {cfg['label']}\n\n"
            "Опишите, что хотите сгенерировать (на русском или английском):",
            parse_mode="HTML",
            reply_markup=InlineKeyboardBuilder()
            .button(text="❌ Отмена", callback_data="menu:main")
            .as_markup(),
        )


@router.message(ImageGenState.waiting_for_input_image, F.photo)
async def imggen_got_input_image(message: Message, state: FSMContext):
    input_url = await _get_telegram_file_url(message)
    await state.update_data(input_url=input_url)
    await state.set_state(ImageGenState.waiting_for_prompt)

    data = await state.get_data()
    model_label = MODELS[data["model_key"]]["label"]

    await message.answer(
        f"✅ Изображение получено!\n\n"
        f"🎨 <b>{model_label}</b>\n\n"
        "Теперь опишите, что нужно сделать с изображением:",
        parse_mode="HTML",
        reply_markup=InlineKeyboardBuilder()
        .button(text="❌ Отмена", callback_data="menu:main")
        .as_markup(),
    )


@router.message(ImageGenState.waiting_for_input_image)
async def imggen_input_image_wrong(message: Message):
    await message.answer(
        "Пожалуйста, отправьте изображение как фото (не файл).",
        reply_markup=InlineKeyboardBuilder()
        .button(text="❌ Отмена", callback_data="menu:main")
        .as_markup(),
    )


@router.message(ImageGenState.waiting_for_prompt)
async def imggen_got_prompt(message: Message, state: FSMContext):
    prompt = message.text.strip() if message.text else ""
    if not prompt:
        await message.answer("Пожалуйста, введите текстовое описание.")
        return

    await state.update_data(prompt=prompt)
    await state.set_state(ImageGenState.waiting_for_ratio)

    data = await state.get_data()
    model_key = data.get("model_key", "seedream")
    model_label = MODELS[model_key]["label"]

    await message.answer(
        f"📐 <b>{model_label}</b>\n\nВыберите соотношение сторон:",
        parse_mode="HTML",
        reply_markup=_ratio_keyboard(model_key),
    )


@router.callback_query(ImageGenState.waiting_for_ratio, F.data.startswith("imggen:ratio:"))
async def imggen_got_ratio(callback: CallbackQuery, state: FSMContext):
    ratio_value = callback.data.split("imggen:ratio:")[1]
    data = await state.get_data()
    prompt = data.get("prompt", "")
    model_key = data.get("model_key", "seedream")
    input_url = data.get("input_url", "")
    await state.clear()

    model_label = MODELS[model_key]["label"]

    # Check and deduct credits
    success, cost, remaining = check_and_deduct_credits(
        callback.from_user.id, model_key
    )
    if not success:
        await callback.message.edit_text(
            f"❌ <b>Недостаточно токенов</b>\n\n"
            f"Для генерации с моделью <b>{model_label}</b> нужно <b>{cost}</b> токенов.\n"
            f"Ваш баланс: <b>{remaining}</b> токенов.\n\n"
            f"Пополните баланс в приложении 👇",
            parse_mode="HTML",
            reply_markup=_insufficient_credits_keyboard(),
        )
        return

    extra = "\n🖼 С исходным изображением" if input_url else ""

    progress_msg = await callback.message.edit_text(
        f"⏳ <b>Генерирую изображение...</b>\n\n"
        f"🤖 {model_label}{extra}\n"
        f"📝 <i>{prompt[:200]}</i>\n"
        f"📐 {ratio_value}\n\n"
        "Это может занять до 2 минут. Подождите...",
        parse_mode="HTML",
    )

    await _run_generation(progress_msg, model_key, prompt, ratio_value, input_url)
