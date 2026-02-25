"""
RAG-поиск по описанию + адаптация промпта через Claude
"""
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, BufferedInputFile
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.database import search_similar_posts, get_post_by_id, get_category_emoji
from bot.db_composer import compose_from_db_post
from bot.ai_agent import generate_adapted_prompt, categorize_user_request

router = Router()


class SearchState(StatesGroup):
    waiting_for_query = State()
    waiting_for_adapt_idea = State()


def build_search_result_keyboard(post_id: int):
    builder = InlineKeyboardBuilder()
    builder.button(text="📝 Оригинальный промпт", callback_data=f"prompt:{post_id}")
    builder.button(text="🤖 Адаптировать под меня", callback_data=f"adapt:{post_id}")
    builder.button(text="🎨 Сгенерировать похожее", callback_data=f"genlike:{post_id}")
    builder.button(text="🔍 Искать другое", callback_data="search:start")
    builder.button(text="🏠 В меню", callback_data="menu:main")
    builder.adjust(1, 1, 1, 2)
    return builder.as_markup()


def build_adapt_keyboard(post_id: int):
    builder = InlineKeyboardBuilder()
    builder.button(text="🔄 Сгенерировать ещё раз", callback_data=f"adapt:{post_id}")
    builder.button(text="📝 Оригинальный промпт", callback_data=f"prompt:{post_id}")
    builder.button(text="🎨 Сгенерировать похожее", callback_data=f"genlike:{post_id}")
    builder.button(text="🔍 Новый поиск", callback_data="search:start")
    builder.button(text="🏠 В меню", callback_data="menu:main")
    builder.adjust(1, 1, 1, 2)
    return builder.as_markup()


@router.callback_query(F.data == "search:start")
async def search_start(callback: CallbackQuery, state: FSMContext):
    await state.set_state(SearchState.waiting_for_query)
    await callback.message.answer(
        "🔍 <b>Опиши свою идею</b>\n\n"
        "Например:\n"
        "• <i>девушка в красном платье на закате</i>\n"
        "• <i>cinematic portrait with dramatic lighting</i>\n"
        "• <i>уличная фотография в стиле 90-х</i>\n\n"
        "Можно писать на русском или английском 👇",
        parse_mode="HTML",
    )
    await callback.answer()


@router.message(SearchState.waiting_for_query)
async def handle_search_query(message: Message, state: FSMContext):
    await state.clear()
    query = message.text.strip()

    if len(query) < 3:
        await message.answer("Слишком короткий запрос. Опиши идею подробнее!")
        return

    thinking_msg = await message.answer("🔍 Ищу похожие работы...")

    try:
        # Переводим запрос в английский для лучшего поиска
        english_query = await categorize_user_request(query)

        # RAG-поиск
        similar_posts = search_similar_posts(english_query, n_results=1)

        await thinking_msg.delete()

        if not similar_posts:
            await message.answer(
                "😔 Не нашёл похожих работ. Попробуй другое описание.",
                reply_markup=InlineKeyboardBuilder()
                .button(text="🔍 Попробовать снова", callback_data="search:start")
                .button(text="🏠 В меню", callback_data="menu:main")
                .adjust(1)
                .as_markup(),
            )
            return

        post = similar_posts[0]
        category = post.get("category", "Unknown")
        emoji = get_category_emoji(category)
        score = post.get("similarity_score", 0)

        # Составное изображение из данных БД
        image_bytes = compose_from_db_post(post)

        refs_count = len(post.get("reference_images", []))
        caption = (
            f"🎯 <b>Нашёл похожую работу</b> (совпадение: {score:.0%})\n"
            f"{emoji} Категория: <b>{category}</b>\n"
            f"🖼 Референсов: {refs_count}\n\n"
            f"Запрос: <i>{query}</i>\n\n"
            f"Что дальше?"
        )

        # Сохраняем post_id и идею в state для адаптации
        await state.update_data(last_post_id=post["id"], user_idea=query)

        keyboard = build_search_result_keyboard(post["id"])

        if image_bytes:
            photo = BufferedInputFile(image_bytes, filename="result.jpg")
            await message.answer_photo(
                photo=photo,
                caption=caption,
                parse_mode="HTML",
                reply_markup=keyboard,
            )
        else:
            await message.answer(caption, parse_mode="HTML", reply_markup=keyboard)

    except Exception as e:
        await thinking_msg.delete()
        await message.answer(f"Ошибка при поиске: {e}")


@router.callback_query(F.data.startswith("adapt:"))
async def start_adapt(callback: CallbackQuery, state: FSMContext):
    post_id = int(callback.data.split(":", 1)[1])
    await state.update_data(adapt_post_id=post_id)

    # Проверяем, есть ли уже сохранённая идея
    data = await state.get_data()
    user_idea = data.get("user_idea")

    if user_idea and data.get("last_post_id") == post_id:
        # Уже есть идея — сразу генерируем
        await callback.answer("Генерирую промпт...")
        await _do_adapt(callback.message, post_id, user_idea, state)
    else:
        # Просим описать идею
        await state.set_state(SearchState.waiting_for_adapt_idea)
        await callback.message.answer(
            "🤖 <b>Адаптирую промпт под тебя</b>\n\n"
            "Опиши свою идею — что ты хочешь создать?\n"
            "Я возьму структуру оригинального промпта и адаптирую под твой запрос.\n\n"
            "Можно писать на любом языке 👇",
            parse_mode="HTML",
        )
        await callback.answer()


@router.message(SearchState.waiting_for_adapt_idea)
async def handle_adapt_idea(message: Message, state: FSMContext):
    data = await state.get_data()
    post_id = data.get("adapt_post_id")
    user_idea = message.text.strip()
    await state.update_data(user_idea=user_idea)
    await state.clear()

    if not post_id:
        await message.answer("Ошибка: не выбран пост. Начни заново /start")
        return

    await _do_adapt(message, post_id, user_idea, state)


async def _do_adapt(message, post_id: int, user_idea: str, state: FSMContext):
    thinking_msg = await message.answer("🤖 Генерирую адаптированный промпт...")

    try:
        post = get_post_by_id(post_id)
        if not post or not post.get("prompt"):
            await thinking_msg.delete()
            await message.answer("❌ У этого поста нет оригинального промпта для адаптации")
            return

        category = post.get("category", "Unknown")
        original_prompt = post["prompt"]

        adapted = await generate_adapted_prompt(
            user_idea=user_idea,
            original_prompt=original_prompt,
            similar_post_category=category,
        )

        await thinking_msg.delete()

        emoji = get_category_emoji(category)
        text = (
            f"🤖 <b>Адаптированный промпт</b>\n"
            f"{emoji} Категория: <b>{category}</b>\n"
            f"Идея: <i>{user_idea[:100]}</i>\n\n"
            f"<code>{adapted}</code>"
        )

        await message.answer(
            text,
            parse_mode="HTML",
            reply_markup=build_adapt_keyboard(post_id),
        )

    except Exception as e:
        await thinking_msg.delete()
        await message.answer(f"Ошибка при генерации: {e}")
