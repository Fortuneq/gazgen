"""
Просмотр постов по категориям
"""
import io
from aiogram import Router, F
from aiogram.types import CallbackQuery, BufferedInputFile
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.database import get_random_post_by_category, get_category_emoji
from bot.db_composer import compose_from_db_post

router = Router()


def build_post_keyboard(post_id: int, category: str):
    builder = InlineKeyboardBuilder()
    builder.button(text="➡️ Следующая", callback_data=f"cat:{category}")
    builder.button(text="📝 Показать промпт", callback_data=f"prompt:{post_id}")
    builder.button(text="🎨 Сгенерировать похожее", callback_data=f"genlike:{post_id}")
    builder.button(text="🔍 Описать свою идею", callback_data="search:start")
    builder.button(text="🏠 В меню", callback_data="menu:main")
    builder.adjust(2, 1, 1, 1)
    return builder.as_markup()


def build_prompt_keyboard(post_id: int, category: str):
    builder = InlineKeyboardBuilder()
    builder.button(text="🤖 Адаптировать под меня", callback_data=f"adapt:{post_id}")
    builder.button(text="🎨 Сгенерировать похожее", callback_data=f"genlike:{post_id}")
    builder.button(text="➡️ Следующая", callback_data=f"cat:{category}")
    builder.button(text="🏠 В меню", callback_data="menu:main")
    builder.adjust(1, 1, 2)
    return builder.as_markup()


@router.callback_query(F.data.startswith("cat:"))
async def show_category_post(callback: CallbackQuery):
    category = callback.data.split(":", 1)[1]
    emoji = get_category_emoji(category)

    await callback.answer(f"Загружаю {emoji} {category}...")

    post = get_random_post_by_category(category)
    if not post:
        await callback.message.answer(f"Нет постов в категории {category}")
        return

    # Создаём составное изображение из данных БД
    image_bytes = compose_from_db_post(post)

    refs_count = len(post.get("reference_images", []))
    has_prompt = bool(post.get("prompt"))

    caption = (
        f"{emoji} <b>{category}</b>\n\n"
        f"{'📝 Есть промпт' if has_prompt else '📝 Без промпта'} • "
        f"{'🖼 ' + str(refs_count) + ' референсов' if refs_count > 0 else '🖼 Без референсов'}\n\n"
        f"Нажми <b>«Показать промпт»</b> чтобы получить текст для генерации"
    )

    keyboard = build_post_keyboard(post["id"], category)

    if image_bytes:
        photo = BufferedInputFile(image_bytes, filename="post.jpg")
        try:
            await callback.message.answer_photo(
                photo=photo,
                caption=caption,
                parse_mode="HTML",
                reply_markup=keyboard,
            )
        except Exception:
            await callback.message.answer(
                caption, parse_mode="HTML", reply_markup=keyboard
            )
    else:
        await callback.message.answer(
            caption, parse_mode="HTML", reply_markup=keyboard
        )


@router.callback_query(F.data.startswith("prompt:"))
async def show_prompt(callback: CallbackQuery):
    post_id = int(callback.data.split(":", 1)[1])
    await callback.answer("Загружаю промпт...")

    from bot.database import get_post_by_id
    post = get_post_by_id(post_id)
    if not post:
        await callback.message.answer("Пост не найден")
        return

    category = post.get("category", "Unknown")
    emoji = get_category_emoji(category)
    prompt = post.get("prompt", "")

    if not prompt:
        await callback.message.answer(
            f"{emoji} <b>{category}</b>\n\n❌ Для этого поста промпт недоступен",
            parse_mode="HTML",
            reply_markup=build_prompt_keyboard(post_id, category),
        )
        return

    # Разбиваем длинный промпт
    display_prompt = prompt[:3000] + ("..." if len(prompt) > 3000 else "")

    text = (
        f"{emoji} <b>{category}</b> — Промпт:\n\n"
        f"<code>{display_prompt}</code>"
    )

    await callback.message.answer(
        text,
        parse_mode="HTML",
        reply_markup=build_prompt_keyboard(post_id, category),
    )
