"""
Photix Bot — configuration: categories, model costs, subscriptions

IMPORTANT: Category display names here MUST match the webapp's
miniapp/src/categoryNames.ts — they share the same DB and should
show identical names to users. When renaming, update BOTH files.
"""

# ── Category display names ───────────────────────────────────
# Maps DB model_name → (display_name, emoji)
# Synced with miniapp/src/categoryNames.ts CATEGORY_DISPLAY
CATEGORY_DISPLAY = {
    "nano_banana_2": ("Nano Banana 2", "🍌"),
    "text2image_soul": ("Soul Art", "🎨"),
    "seedream_v4_5": ("Seedream 4.5", "✨"),
    "ai_influencer": ("Инфлюенсер", "👤"),
    "flux_2": ("Flux 2", "🌊"),
    "cinematic_studio_image": ("Кинематограф", "🎬"),
    "kling_omni_image": ("Kling Omni", "🖼"),
    "text2keyframes": ("Кейфреймы", "🎞"),
    "seedream": ("Seedream", "💫"),
    "nano_banana": ("Nano Banana", "🍌"),
    "text2image_soul_v2": ("Soul Art v2", "🎭"),
    "z_image": ("Z Image", "⚡"),
    "openai_hazel": ("Hazel", "🟢"),
    "canvas_soul": ("Canvas Soul", "🖌"),
    "text2image_gpt": ("GPT Image", "🤖"),
    # Additional models present in webapp but not yet in DB:
    "nano_banana_pro": ("Nano Banana Pro", "🍌"),
    "nano_strawberry": ("Strawberry", "🍓"),
    "nano_peach": ("Peach", "🍑"),
    "nano_mango": ("Mango", "🥭"),
    "nano_kiwi": ("Kiwi", "🥝"),
    "nano_cherry": ("Cherry", "🍒"),
    "nano_lemon": ("Lemon", "🍋"),
    "nano_grape": ("Grape", "🍇"),
    "nano_melon": ("Melon", "🍈"),
    "nano_orange": ("Orange", "🍊"),
    "nano_pineapple": ("Pineapple", "🍍"),
}

# Minimum number of posts to show a category in the main list
MIN_CATEGORY_POSTS = 5

def get_display_name(model_name: str) -> str:
    """Get human-readable name for a DB model_name category."""
    entry = CATEGORY_DISPLAY.get(model_name)
    if entry:
        return entry[0]
    return model_name.replace("_", " ").title()

def get_emoji(model_name: str) -> str:
    """Get emoji for a DB model_name category."""
    entry = CATEGORY_DISPLAY.get(model_name)
    return entry[1] if entry else "🎨"


# ── Photo generation: token costs per kie.ai model key ───────
PHOTO_MODEL_COSTS = {
    "seedream": {"tokens": 1, "label": "Seedream", "time": "10-15с"},
    "seedream_v4": {"tokens": 2, "label": "Seedream V4", "time": "10-20с"},
    "banana": {"tokens": 1, "label": "Nano Banana Pro", "time": "5-10с"},
    "nano_banana": {"tokens": 1, "label": "Nano Banana", "time": "5-10с"},
    "gpt_text": {"tokens": 2, "label": "GPT Image 1.5", "time": "10-20с"},
    "gpt_img2img": {"tokens": 2, "label": "GPT Img2Img", "time": "10-20с"},
    "gpt4o": {"tokens": 2, "label": "GPT-4o Image", "time": "10-20с"},
    "qwen": {"tokens": 1, "label": "Qwen", "time": "10-15с"},
    "grok": {"tokens": 1, "label": "Grok Imagine", "time": "10-15с"},
}

# ── Map DB category → kie.ai generation model key ────────────
CATEGORY_TO_GEN_MODEL = {
    "nano_banana_2": "banana",
    "nano_banana": "nano_banana",
    "text2image_soul": "seedream",
    "seedream_v4_5": "seedream_v4",
    "ai_influencer": "gpt4o",
    "flux_2": "seedream",
    "cinematic_studio_image": "gpt4o",
    "kling_omni_image": "gpt4o",
    "text2keyframes": "seedream",
    "seedream": "seedream",
    "text2image_soul_v2": "seedream",
    "z_image": "seedream",
    "openai_hazel": "gpt4o",
    "canvas_soul": "seedream",
    "text2image_gpt": "gpt_text",
}

# ── Video model costs (tokens per duration) ──────────────────
VIDEO_MODEL_COSTS = {
    "kling3": {"label": "Kling 3.0", "5s": 5, "10s": 8, "15s": 12},
    "veo3": {"label": "Veo 3", "5s": 6, "10s": 10, "15s": 15},
    "sora2": {"label": "Sora 2", "5s": 7, "10s": 12, "15s": 18},
    "runway4": {"label": "RunWay Gen-4", "5s": 5, "10s": 9, "15s": 14},
    "seedance": {"label": "Seedance", "5s": 5, "10s": 8, "15s": 12},
}

# ── Animate & Face swap costs ────────────────────────────────
ANIMATE_COSTS = {"3s": 2, "5s": 3, "10s": 5}
FACESWAP_COST = 2

# ── Subscription plans ───────────────────────────────────────
SUBSCRIPTION_PLANS = [
    {"id": "start", "name": "Старт", "price": "299₽/мес", "tokens": 50, "desc": "Базовые модели"},
    {"id": "pro", "name": "Про", "price": "699₽/мес", "tokens": 200, "desc": "Все модели + приоритет"},
    {"id": "ultra", "name": "Ультра", "price": "1 490₽/мес", "tokens": 500, "desc": "Все модели + 4K"},
]

# ── Token packs ──────────────────────────────────────────────
TOKEN_PACKS = [
    {"id": "pack50", "amount": 50, "price": "199₽"},
    {"id": "pack150", "amount": 150, "price": "499₽"},
    {"id": "pack500", "amount": 500, "price": "1 490₽"},
]

# ── Aspect ratios ────────────────────────────────────────────
ASPECT_RATIOS = ["1:1", "16:9", "9:16"]

# ── Video categories for discovery ───────────────────────────
VIDEO_CATEGORIES = [
    ("dance", "💃 Танцы"),
    ("business", "💼 Бизнес"),
    ("sport", "⚽ Спорт"),
    ("nature", "🌿 Природа"),
    ("cinema", "🎭 Кино"),
]
