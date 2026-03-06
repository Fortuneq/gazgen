"""
/start handler — приветствие и главное меню
"""
import os

from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, WebAppInfo
from aiogram.filters import CommandStart
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.database import (
    get_all_categories,
    get_category_emoji,
    get_categories_stats,
    get_user_credits,
    ensure_bot_user,
)

router = Router()


def _miniapp_url() -> str | None:
    return os.getenv("MINIAPP_URL")


def build_main_keyboard():
    builder = InlineKeyboardBuilder()
    miniapp_url = _miniapp_url()
    if miniapp_url:
        builder.button(
            text="\U0001f5bc Открыть галерею",
            web_app=WebAppInfo(url=miniapp_url),
        )
    builder.button(text="🎨 Сгенерировать фото", callback_data="imggen:start")
    builder.button(text="🔍 Описать свою идею", callback_data="search:start")
    builder.button(text="📂 Категории", callback_data="show:categories")
    builder.button(text="👤 Профиль", callback_data="profile:show")
    builder.button(text="💰 Купить токены", callback_data="tokens:buy")
    builder.adjust(1, 2, 2, 1)
    return builder.as_markup()


def build_categories_keyboard():
    builder = InlineKeyboardBuilder()
    stats = get_categories_stats()
    categories = get_all_categories()
    for cat in categories:
        emoji = get_category_emoji(cat)
        count = stats.get(cat, 0)
        builder.button(
            text=f"{emoji} {cat} ({count})",
            callback_data=f"cat:{cat}"
        )
    builder.button(text="🏠 В меню", callback_data="menu:main")
    builder.adjust(2)
    return builder.as_markup()


WELCOME_TEXT = """<b>Photix</b> — создавай фото, видео и анимации с помощью лучших нейросетей.

Выбери действие 👇"""


@router.message(CommandStart())
async def cmd_start(message: Message):
    ensure_bot_user(message.from_user.id)
    await message.answer(
        WELCOME_TEXT,
        parse_mode="HTML",
        reply_markup=build_main_keyboard(),
    )


@router.callback_query(F.data == "menu:main")
async def back_to_menu(callback: CallbackQuery):
    try:
        await callback.message.delete()
    except Exception:
        pass
    await callback.message.answer(
        WELCOME_TEXT,
        parse_mode="HTML",
        reply_markup=build_main_keyboard(),
    )
    await callback.answer()


@router.callback_query(F.data == "show:categories")
async def show_categories(callback: CallbackQuery):
    await callback.message.edit_text(
        "📂 <b>Категории</b>\n\nВыберите категорию для просмотра работ:",
        parse_mode="HTML",
        reply_markup=build_categories_keyboard(),
    )
    await callback.answer()


@router.callback_query(F.data == "profile:show")
async def show_profile(callback: CallbackQuery):
    user = callback.from_user
    ensure_bot_user(user.id)
    credits = get_user_credits(user.id)

    name = user.first_name or "Пользователь"
    handle = f"@{user.username}" if user.username else ""

    builder = InlineKeyboardBuilder()
    builder.button(text="💰 Купить токены", callback_data="tokens:buy")
    builder.button(text="🎨 Сгенерировать", callback_data="imggen:start")
    builder.button(text="🏠 В меню", callback_data="menu:main")
    builder.adjust(1, 1, 1)

    await callback.message.edit_text(
        f"👤 <b>{name}</b> {handle}\n\n"
        f"⚡ Баланс: <b>{credits}</b> токенов\n\n"
        f"Токены расходуются на генерацию фото.\n"
        f"1 генерация = 9–35 токенов в зависимости от модели.",
        parse_mode="HTML",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()


@router.callback_query(F.data == "tokens:buy")
async def buy_tokens(callback: CallbackQuery):
    miniapp_url = _miniapp_url()
    builder = InlineKeyboardBuilder()
    if miniapp_url:
        sub_url = miniapp_url.rstrip("/") + "/subscription"
        builder.button(
            text="🛒 Открыть магазин токенов",
            web_app=WebAppInfo(url=sub_url),
        )
    builder.button(text="🏠 В меню", callback_data="menu:main")
    builder.adjust(1)

    credits = get_user_credits(callback.from_user.id)

    await callback.message.edit_text(
        f"💰 <b>Купить токены</b>\n\n"
        f"Ваш баланс: <b>{credits}</b> токенов\n\n"
        f"<b>Стоимость генерации:</b>\n"
        f"• Standard (9 токенов) — Seedream, Nano Banana, Qwen, Grok\n"
        f"• Pro (19 токенов) — Banana Pro, GPT Image 1.5\n"
        f"• Ultra (35 токенов) — GPT-4o Image\n\n"
        f"Нажмите кнопку ниже, чтобы пополнить баланс 👇",
        parse_mode="HTML",
        reply_markup=builder.as_markup(),
    )
    await callback.answer()
