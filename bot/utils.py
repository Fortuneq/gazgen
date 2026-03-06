"""
Photix Bot — utility helpers for clean chat UX
"""
import io
import logging
from PIL import Image
from aiogram.types import Message, CallbackQuery, InputMediaPhoto
from aiogram.exceptions import TelegramBadRequest

logger = logging.getLogger(__name__)

# Telegram photo size limit
MAX_PHOTO_BYTES = 9 * 1024 * 1024  # 9MB (leave margin under 10MB)
MAX_PHOTO_DIMENSION = 1280


def compress_photo(image_bytes: bytes) -> bytes:
    """Compress image to fit Telegram's 10MB photo limit.
    Resizes to max 1280px and compresses JPEG quality."""
    if len(image_bytes) <= MAX_PHOTO_BYTES:
        # Try to verify it's a valid image even if small enough
        try:
            img = Image.open(io.BytesIO(image_bytes))
            img.verify()
            return image_bytes
        except Exception:
            return image_bytes

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Resize if needed
        w, h = img.size
        if max(w, h) > MAX_PHOTO_DIMENSION:
            ratio = MAX_PHOTO_DIMENSION / max(w, h)
            new_w, new_h = int(w * ratio), int(h * ratio)
            img = img.resize((new_w, new_h), Image.LANCZOS)

        # Compress with decreasing quality until under limit
        for quality in (85, 70, 55, 40):
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=quality, optimize=True)
            data = buf.getvalue()
            if len(data) <= MAX_PHOTO_BYTES:
                return data

        # Last resort: very small
        buf = io.BytesIO()
        img = img.resize((640, int(640 * img.height / img.width)), Image.LANCZOS)
        img.save(buf, format="JPEG", quality=50)
        return buf.getvalue()

    except Exception as e:
        logger.error("Failed to compress image: %s", e)
        return image_bytes


async def safe_delete(msg: Message):
    """Safely delete a message, ignoring errors"""
    try:
        await msg.delete()
    except TelegramBadRequest:
        pass
    except Exception as e:
        logger.debug("Could not delete message: %s", e)


async def safe_edit_text(msg: Message, text: str, reply_markup=None, parse_mode="HTML"):
    """Edit message text, or send new if edit fails"""
    try:
        return await msg.edit_text(text, parse_mode=parse_mode, reply_markup=reply_markup)
    except TelegramBadRequest as e:
        if "message is not modified" in str(e):
            return msg
        if "there is no text in the message" in str(e) or "message can't be edited" in str(e):
            await safe_delete(msg)
            return await msg.answer(text, parse_mode=parse_mode, reply_markup=reply_markup)
        raise


async def safe_edit_media(msg: Message, photo, caption: str, reply_markup=None, parse_mode="HTML"):
    """Edit message media (photo), or delete+resend if edit fails"""
    try:
        media = InputMediaPhoto(media=photo, caption=caption, parse_mode=parse_mode)
        return await msg.edit_media(media=media, reply_markup=reply_markup)
    except TelegramBadRequest as e:
        if "message is not modified" in str(e):
            return msg
        # Can't edit — delete and resend
        await safe_delete(msg)
        return await msg.answer_photo(photo=photo, caption=caption, parse_mode=parse_mode, reply_markup=reply_markup)
    except Exception:
        await safe_delete(msg)
        return await msg.answer_photo(photo=photo, caption=caption, parse_mode=parse_mode, reply_markup=reply_markup)


def insufficient_tokens_text(needed: int, balance: int) -> str:
    return f"❌ <b>Недостаточно токенов</b>\n\nНужно: {needed} | Баланс: {balance}"
