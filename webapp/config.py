import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "gasgen")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

KIE_API_KEY = os.getenv("KIE_API_KEY", "")
IMGBB_API_KEY = os.getenv("IMGBB_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
MINIAPP_URL = os.getenv("MINIAPP_URL", "")

CRYPTOCLOUD_API_KEY = os.getenv("CRYPTOCLOUD_API_KEY", "")
CRYPTOCLOUD_SHOP_ID = os.getenv("CRYPTOCLOUD_SHOP_ID", "")
CRYPTOCLOUD_SECRET = os.getenv("CRYPTOCLOUD_SECRET", "")

PALLY_API_TOKEN = os.getenv("PALLY_API_TOKEN", "")
PALLY_SHOP_ID = os.getenv("PALLY_SHOP_ID", "")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

MODEL_EMOJIS = {
    "nano_banana_pro": "\U0001f34c",
    "nano_banana_2": "\U0001f34c",
    "nano_banana": "\U0001f34c",
    "nano_strawberry": "\U0001f353",
    "nano_peach": "\U0001f351",
    "nano_mango": "\U0001f96d",
    "nano_kiwi": "\U0001f95d",
    "nano_cherry": "\U0001f352",
    "nano_lemon": "\U0001f34b",
    "nano_grape": "\U0001f347",
    "nano_melon": "\U0001f348",
    "nano_orange": "\U0001f34a",
    "nano_pineapple": "\U0001f34d",
}
DEFAULT_EMOJI = "\U0001f3a8"


def get_category_emoji(category: str) -> str:
    if not category:
        return DEFAULT_EMOJI
    if category in MODEL_EMOJIS:
        return MODEL_EMOJIS[category]
    cat_lower = category.lower()
    for key, emoji in MODEL_EMOJIS.items():
        if key in cat_lower or cat_lower in key:
            return emoji
    return DEFAULT_EMOJI
