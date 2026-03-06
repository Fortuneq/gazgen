"""
Face swap flow — Photix Bot
Flow: Upload source face → Upload target photo → Generate
Note: Face swap API not yet connected — placeholder
"""
import os
import logging
from aiogram import Router, F
from aiogram.types import CallbackQuery, Message, FSInputFile
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.config import FACESWAP_COST
from bot.user_db import get_balance, deduct_tokens
from bot.utils import safe_edit_text, safe_delete, insufficient_tokens_text

router = Router()
logger = logging.getLogger(__name__)

PROMO_FACESWAP_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "promo_faceswap.png")


class FaceSwapState(StatesGroup):
    waiting_source = State()
    waiting_target = State()


@router.callback_query(F.data == "flow:faceswap")
async def faceswap_start(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await state.set_state(FaceSwapState.waiting_source)

    balance = get_balance(callback.from_user.id)
    if balance < FACESWAP_COST:
        builder = InlineKeyboardBuilder()
        builder.button(text="💳 Пополнить", callback_data="purchase:menu")
        builder.button(text="🏠 Меню", callback_data="menu:main")
        builder.adjust(2)
        await safe_edit_text(
            callback.message,
            insufficient_tokens_text(FACESWAP_COST, balance),
            reply_markup=builder.as_markup(),
        )
        await callback.answer()
        return

    builder = InlineKeyboardBuilder()
    builder.button(text="⬅ Назад", callback_data="menu:main")

    intro_text = (
        f"🎭 <b>Замена лица</b>\n\n"
        f"Отправь 2 фото по очереди:\n"
        f"1️⃣ Источник лица\n"
        f"2️⃣ Целевое фото\n\n"
        f"💰 Стоимость: <b>{FACESWAP_COST}</b> токенов"
    )

    # Send promo image with text
    try:
        await callback.message.delete()
    except Exception:
        pass

    try:
        promo = FSInputFile(PROMO_FACESWAP_PATH, filename="faceswap_promo.png")
        await callback.message.answer_photo(
            photo=promo,
            caption=intro_text,
            parse_mode="HTML",
            reply_markup=builder.as_markup(),
        )
    except Exception as e:
        logger.warning("Could not send faceswap promo: %s", e)
        await callback.message.answer(
            intro_text,
            parse_mode="HTML",
            reply_markup=builder.as_markup(),
        )

    await callback.answer()


@router.message(FaceSwapState.waiting_source, F.photo)
async def receive_source(message: Message, state: FSMContext):
    photo = message.photo[-1]
    file = await message.bot.get_file(photo.file_id)
    token = message.bot.token
    url = f"https://api.telegram.org/file/bot{token}/{file.file_path}"

    await state.update_data(source_url=url)
    await state.set_state(FaceSwapState.waiting_target)
    await safe_delete(message)

    await message.answer(
        "✅ <b>Фото 1 получено</b>\n\n"
        "Теперь отправь целевое фото (2️⃣):",
        parse_mode="HTML",
    )


@router.message(FaceSwapState.waiting_source)
async def wrong_source(message: Message):
    await message.answer("Отправь фото (не файл).")


@router.message(FaceSwapState.waiting_target, F.photo)
async def receive_target(message: Message, state: FSMContext):
    photo = message.photo[-1]
    file = await message.bot.get_file(photo.file_id)
    token = message.bot.token
    url = f"https://api.telegram.org/file/bot{token}/{file.file_path}"

    await state.update_data(target_url=url)
    await safe_delete(message)
    await state.clear()

    builder = InlineKeyboardBuilder()
    builder.button(text="🏠 Меню", callback_data="menu:main")
    builder.adjust(1)

    await message.answer(
        "🚧 <b>Замена лица</b>\n\n"
        "Замена лица будет доступна в ближайшем обновлении.\n"
        "Токены не были списаны.\n"
        "Следите за новостями!",
        parse_mode="HTML",
        reply_markup=builder.as_markup(),
    )


@router.message(FaceSwapState.waiting_target)
async def wrong_target(message: Message):
    await message.answer("Отправь фото (не файл).")
