"""
User profile — Photix Bot
Shows balance and generation stats
"""
from aiogram import Router, F
from aiogram.types import CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.user_db import get_or_create_user
from bot.utils import safe_edit_text

router = Router()


@router.callback_query(F.data == "profile:show")
async def show_profile(callback: CallbackQuery):
    user = get_or_create_user(
        callback.from_user.id,
        callback.from_user.username,
        callback.from_user.first_name,
    )

    name = user.get("first_name") or user.get("username") or "Пользователь"
    handle = f"@{callback.from_user.username}" if callback.from_user.username else ""
    tokens = user.get("tokens", 0)
    gens = user.get("total_generations", 0)

    builder = InlineKeyboardBuilder()
    builder.button(text="💰 Купить токены", callback_data="purchase:menu")
    builder.button(text="🎨 Сгенерировать", callback_data="flow:photo")
    builder.button(text="⬅ Назад", callback_data="menu:main")
    builder.adjust(1, 1, 1)

    await safe_edit_text(
        callback.message,
        f"👤 <b>{name}</b> {handle}\n\n"
        f"⚡ Баланс: <b>{tokens}</b> токенов\n"
        f"🎨 Генераций: {gens}\n\n"
        f"1 генерация = 9–35 токенов в зависимости от модели.",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()
