"""
/start handler — приветствие и главное меню
"""
import os

from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, WebAppInfo
from aiogram.filters import CommandStart
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.database import get_all_categories, get_category_emoji, get_categories_stats

router = Router()


def build_categories_keyboard():
    builder = InlineKeyboardBuilder()
    miniapp_url = os.getenv("MINIAPP_URL")
    if miniapp_url:
        builder.button(
            text="\U0001f5bc \u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0433\u0430\u043b\u0435\u0440\u0435\u044e",
            web_app=WebAppInfo(url=miniapp_url),
        )
    stats = get_categories_stats()
    categories = get_all_categories()
    for cat in categories:
        emoji = get_category_emoji(cat)
        count = stats.get(cat, 0)
        builder.button(
            text=f"{emoji} {cat} ({count})",
            callback_data=f"cat:{cat}"
        )
    builder.button(text="🔍 Описать свою идею", callback_data="search:start")
    builder.button(text="🎨 Сгенерировать изображение", callback_data="imggen:start")
    # Автоматически подбираем раскладку кнопок
    n = len(categories)
    if n <= 4:
        builder.adjust(2, 1, 1)
    else:
        builder.adjust(2, 1, 1)
    return builder.as_markup()


WELCOME_TEXT = """👋 Привет! Это бот для вдохновения из сообщества <b>Higgsfield AI</b>.

Здесь ты можешь:
• 📂 Просматривать крутые работы по категориям
• 🔍 Найти похожую работу по своей идее
• 📝 Получить оригинальный или адаптированный промпт
• 🖼 Увидеть результат + референсные фото вместе
• 🎨 Сгенерировать изображение по своему описанию

Выбери категорию или опиши что ты хочешь создать 👇"""


@router.message(CommandStart())
async def cmd_start(message: Message):
    await message.answer(
        WELCOME_TEXT,
        parse_mode="HTML",
        reply_markup=build_categories_keyboard(),
    )


@router.callback_query(F.data == "menu:main")
async def back_to_menu(callback: CallbackQuery):
    # Удаляем текущее сообщение (может быть с фото)
    try:
        await callback.message.delete()
    except:
        pass

    # Отправляем новое меню
    await callback.message.answer(
        WELCOME_TEXT,
        parse_mode="HTML",
        reply_markup=build_categories_keyboard(),
    )
    await callback.answer()
