"""
/start handler and main menu — Photix Bot
Clean chat: single message edited for navigation
"""
import os
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, WebAppInfo
from aiogram.filters import CommandStart
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.user_db import get_or_create_user, get_balance
from bot.utils import safe_edit_text, safe_delete

router = Router()

WELCOME_TEXT = (
    "👋 <b>Добро пожаловать в Photix!</b>\n\n"
    "Создавай фото и видео с помощью AI."
)


def main_menu_keyboard(balance: int):
    builder = InlineKeyboardBuilder()
    builder.button(text="🎨 Создать фото", callback_data="flow:photo")
    builder.button(text="🎬 Создать видео", callback_data="flow:video")
    builder.button(text="✨ Оживить фото", callback_data="flow:animate")
    builder.button(text="🎭 Замена лица", callback_data="flow:faceswap")
    builder.button(text="💰 Купить токены", callback_data="purchase:menu")
    builder.button(text="👤 Профиль", callback_data="profile:show")
    miniapp_url = os.getenv("MINIAPP_URL")
    if miniapp_url:
        builder.button(text="🌐 Веб-приложение", web_app=WebAppInfo(url=miniapp_url))
    builder.adjust(2, 2, 2, 1)
    return builder.as_markup()


def main_menu_text(balance: int) -> str:
    return f"<b>Photix</b> | ⚡ <b>{balance}</b> токенов"


@router.message(CommandStart())
async def cmd_start(message: Message):
    user = get_or_create_user(
        message.from_user.id,
        message.from_user.username,
        message.from_user.first_name,
    )
    balance = user["tokens"]

    welcome = await message.answer(WELCOME_TEXT, parse_mode="HTML")
    import asyncio
    await asyncio.sleep(1.5)
    await safe_delete(welcome)
    await message.answer(
        main_menu_text(balance),
        parse_mode="HTML",
        reply_markup=main_menu_keyboard(balance),
    )


@router.callback_query(F.data == "menu:main")
async def back_to_menu(callback: CallbackQuery):
    balance = get_balance(callback.from_user.id)
    try:
        await safe_edit_text(
            callback.message,
            main_menu_text(balance),
            reply_markup=main_menu_keyboard(balance),
        )
    except Exception:
        await safe_delete(callback.message)
        await callback.message.answer(
            main_menu_text(balance),
            parse_mode="HTML",
            reply_markup=main_menu_keyboard(balance),
        )
    await callback.answer()
