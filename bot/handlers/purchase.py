"""
Token purchase — links to webapp for payment
"""
import os
from aiogram import Router, F
from aiogram.types import CallbackQuery, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.user_db import get_balance
from bot.utils import safe_edit_text

router = Router()


@router.callback_query(F.data == "purchase:menu")
async def purchase_menu(callback: CallbackQuery):
    balance = get_balance(callback.from_user.id)

    builder = InlineKeyboardBuilder()
    miniapp_url = os.getenv("MINIAPP_URL")
    if miniapp_url:
        sub_url = miniapp_url.rstrip("/") + "/subscription"
        builder.button(
            text="🛒 Открыть магазин токенов",
            web_app=WebAppInfo(url=sub_url),
        )
    builder.button(text="⬅ Назад", callback_data="menu:main")
    builder.adjust(1)

    await safe_edit_text(
        callback.message,
        f"💰 <b>Купить токены</b>\n\n"
        f"⚡ Баланс: <b>{balance}</b> токенов\n\n"
        f"<b>Стоимость генерации:</b>\n"
        f"• Standard (9 токенов) — Seedream, Nano Banana, Qwen, Grok\n"
        f"• Pro (19 токенов) — Banana Pro, GPT Image 1.5\n"
        f"• Ultra (35 токенов) — GPT-4o Image\n\n"
        f"Нажмите кнопку ниже, чтобы пополнить баланс 👇",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()
