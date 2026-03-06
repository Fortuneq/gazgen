"""
Photix Telegram Bot — entry point
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

from bot.handlers import (
    menu,
    photo_flow,
    custom_prompt,
    video_flow,
    animate_flow,
    faceswap_flow,
    purchase,
    profile,
    image_gen,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def main():
    bot_token = os.getenv("BOT_TOKEN")
    if not bot_token:
        raise ValueError("BOT_TOKEN not set in .env")

    # Ensure users table exists
    logger.info("Ensuring users table...")
    from bot.user_db import ensure_users_table
    ensure_users_table()

    # Warm up models at startup
    logger.info("Loading post index...")
    from bot.database import get_all_posts, get_model
    posts = get_all_posts()
    logger.info(f"Loaded {len(posts)} posts")

    logger.info("Loading sentence-transformers model...")
    get_model()
    logger.info("Model loaded")

    bot = Bot(
        token=bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )

    # Set MiniApp menu button
    miniapp_url = os.getenv("MINIAPP_URL")
    if miniapp_url:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="🖼 Gallery",
                web_app=WebAppInfo(url=miniapp_url),
            )
        )
        logger.info("MiniApp menu button set: %s", miniapp_url)

    dp = Dispatcher(storage=MemoryStorage())

    # Register handlers (order matters — more specific first)
    dp.include_router(menu.router)
    dp.include_router(photo_flow.router)
    dp.include_router(custom_prompt.router)
    dp.include_router(video_flow.router)
    dp.include_router(animate_flow.router)
    dp.include_router(faceswap_flow.router)
    dp.include_router(purchase.router)
    dp.include_router(profile.router)
    dp.include_router(image_gen.router)  # Keep for generation logic reuse

    logger.info("Photix bot started!")
    await dp.start_polling(bot, skip_updates=True)


if __name__ == "__main__":
    asyncio.run(main())
