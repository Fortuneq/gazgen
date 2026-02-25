"""
Точка входа Telegram-бота
"""
import asyncio
import logging
import os
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import MenuButtonWebApp, WebAppInfo

from bot.handlers import start, categories, search, image_gen, generate_like

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def main():
    bot_token = os.getenv("BOT_TOKEN")
    if not bot_token:
        raise ValueError("BOT_TOKEN не задан в .env")

    # Прогреваем модели при старте
    logger.info("Загружаем индекс постов...")
    from bot.database import get_all_posts, get_model
    posts = get_all_posts()
    logger.info(f"Загружено {len(posts)} постов")

    logger.info("Загружаем sentence-transformers модель...")
    get_model()
    logger.info("Модель загружена")

    bot = Bot(
        token=bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )

    # Set MiniApp menu button if URL is configured
    miniapp_url = os.getenv("MINIAPP_URL")
    if miniapp_url:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="\U0001f5bc Gallery",
                web_app=WebAppInfo(url=miniapp_url),
            )
        )
        logger.info("MiniApp menu button set: %s", miniapp_url)

    dp = Dispatcher(storage=MemoryStorage())

    # Регистрируем хэндлеры
    dp.include_router(start.router)
    dp.include_router(categories.router)
    dp.include_router(search.router)
    dp.include_router(image_gen.router)
    dp.include_router(generate_like.router)

    logger.info("Бот запущен!")
    await dp.start_polling(bot, skip_updates=True)


if __name__ == "__main__":
    asyncio.run(main())
