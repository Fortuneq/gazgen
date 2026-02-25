"""
Индексатор данных Higgsfield → ChromaDB
Категоризация по названию модели (model_name из data.json)
Запускать один раз: python indexer.py
"""
import json
import os
from pathlib import Path
from collections import Counter
from dotenv import load_dotenv
import chromadb
from sentence_transformers import SentenceTransformer

load_dotenv()

DATA_DIR = Path(os.getenv("DATA_DIR", "higgsfield_data_v3"))
CHROMA_DIR = os.getenv("CHROMA_DIR", "chroma_db")

# Эмодзи для известных моделей Higgsfield
MODEL_EMOJIS = {
    "Nano Banana Pro": "🍌",
    "Nano Banana": "🍌",
    "Nano Strawberry": "🍓",
    "Nano Peach": "🍑",
    "Nano Mango": "🥭",
    "Nano Kiwi": "🥝",
    "Nano Cherry": "🍒",
    "Nano Lemon": "🍋",
    "Nano Grape": "🍇",
    "Nano Melon": "🍈",
    "Nano Orange": "🍊",
    "Nano Pineapple": "🍍",
    "Unknown": "🎨",
}


def get_model_emoji(model_name: str) -> str:
    if not model_name:
        return "🎨"
    # Точное совпадение
    if model_name in MODEL_EMOJIS:
        return MODEL_EMOJIS[model_name]
    # Частичное совпадение
    for key, emoji in MODEL_EMOJIS.items():
        if key.lower() in model_name.lower() or model_name.lower() in key.lower():
            return emoji
    return "🎨"


def load_posts() -> list[dict]:
    """Загружает все посты из директории"""
    posts = []
    for post_dir in sorted(DATA_DIR.iterdir()):
        if not post_dir.is_dir() or not post_dir.name.startswith("post_"):
            continue
        json_path = post_dir / "data.json"
        if not json_path.exists():
            continue
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        img_path = post_dir / "result.webp"
        if not img_path.exists():
            continue
        data["local_folder"] = str(post_dir)
        posts.append(data)
    return posts


def build_index():
    print("=== Индексация постов Higgsfield (по model_name) ===\n")

    posts = load_posts()
    print(f"✓ Найдено постов: {len(posts)}")

    # Фильтруем только посты с промптами
    posts_with_prompts = [p for p in posts if p.get("prompt") and len(p["prompt"].strip()) >= 10]
    print(f"  - С промптом: {len(posts_with_prompts)}")
    print(f"  - Без промпта (пропускаем): {len(posts) - len(posts_with_prompts)}")

    if len(posts_with_prompts) == 0:
        print("❌ Нет постов с промптами! Запустите парсер сначала.")
        return

    # Назначаем категорию = название модели (или "Unknown")
    for post in posts_with_prompts:
        model_name = post.get("model_name")
        if model_name and isinstance(model_name, str) and len(model_name.strip()) > 0:
            post["category"] = model_name.strip()
        else:
            post["category"] = "Unknown"

    # Статистика по категориям (моделям)
    cat_counts = Counter(p["category"] for p in posts_with_prompts)
    print("\nРаспределение по моделям:")
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        emoji = get_model_emoji(cat)
        print(f"  {emoji} {cat}: {count} постов")

    # Загружаем модель эмбеддингов
    print("\nЗагружаем модель sentence-transformers...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    # Создаём эмбеддинги
    print("Создаём эмбеддинги...")
    prompts = [p["prompt"][:1000] for p in posts_with_prompts]
    embeddings = model.encode(prompts, show_progress_bar=True, normalize_embeddings=True)

    # Инициализируем ChromaDB
    print("\nСохраняем в ChromaDB...")
    client = chromadb.PersistentClient(path=CHROMA_DIR)

    try:
        client.delete_collection("higgsfield_posts")
        print("  Старая коллекция удалена")
    except Exception:
        pass

    collection = client.create_collection(
        name="higgsfield_posts",
        metadata={"hnsw:space": "cosine"},
    )

    # Добавляем батчами
    ids = []
    docs = []
    metadatas = []
    embeds = []

    for i, post in enumerate(posts_with_prompts):
        ids.append(f"post_{post['id']:04d}")
        docs.append(post["prompt"][:1000])
        metadatas.append({
            "post_id": post["id"],
            "folder": post["local_folder"],
            "category": post["category"],
            "model_name": post.get("model_name") or "Unknown",
            "has_references": len(post.get("reference_images", [])) > 0,
            "ref_count": len(post.get("reference_images", [])),
        })
        embeds.append(embeddings[i].tolist())

    batch_size = 50
    for i in range(0, len(ids), batch_size):
        collection.add(
            ids=ids[i:i + batch_size],
            documents=docs[i:i + batch_size],
            metadatas=metadatas[i:i + batch_size],
            embeddings=embeds[i:i + batch_size],
        )

    # Сохраняем полный индекс в JSON
    index_path = Path(CHROMA_DIR) / "posts_index.json"
    index_path.parent.mkdir(exist_ok=True)
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(posts_with_prompts, f, ensure_ascii=False, indent=2)

    # Сохраняем список всех уникальных категорий (моделей)
    categories = sorted(cat_counts.keys())
    cats_path = Path(CHROMA_DIR) / "categories.json"
    with open(cats_path, "w", encoding="utf-8") as f:
        json.dump({
            "categories": categories,
            "counts": dict(cat_counts),
            "emojis": {cat: get_model_emoji(cat) for cat in categories}
        }, f, ensure_ascii=False, indent=2)

    print(f"\n✓ В ChromaDB добавлено: {len(ids)} постов")
    print(f"✓ Полный индекс: {index_path}")
    print(f"✓ Категории: {cats_path}")

    print(f"\n{'='*50}")
    print("✓ ИНДЕКСАЦИЯ ЗАВЕРШЕНА!")
    print(f"✓ Уникальных моделей (категорий): {len(cat_counts)}")
    print(f"✓ Всего постов: {len(posts_with_prompts)}")
    print(f"{'='*50}")


if __name__ == "__main__":
    build_index()
