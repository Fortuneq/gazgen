"""
Парсер для higgsfield.ai/community (v3 — REST API)
Не использует Playwright/браузер.
Данные берутся напрямую из публичного API:
  https://fnf.higgsfield.ai/publications/community/trending?size=20&type=image
Пагинация через параметр cursor.
"""
import json
import os
import time
from pathlib import Path
import requests

API_BASE = "https://fnf.higgsfield.ai"
COMMUNITY_URL = f"{API_BASE}/publications/community/trending"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://higgsfield.ai/community/",
    "Origin": "https://higgsfield.ai",
    "Accept": "application/json",
}


def download_image(url: str, save_path: str) -> bool:
    """Скачивает изображение по URL"""
    try:
        headers = {
            "User-Agent": HEADERS["User-Agent"],
            "Accept": "image/webp,image/*,*/*;q=0.8",
            "Referer": "https://higgsfield.ai/",
        }
        response = requests.get(url, timeout=30, headers=headers)
        response.raise_for_status()
        with open(save_path, "wb") as f:
            f.write(response.content)
        return True
    except Exception as e:
        print(f"  ! Ошибка скачивания {url[:70]}: {e}")
        return False


def fetch_page(cursor: str | None = None, size: int = 20) -> dict:
    """Запрашивает одну страницу публикаций"""
    params = {"size": size, "type": "image"}
    if cursor:
        params["cursor"] = cursor
    resp = requests.get(COMMUNITY_URL, headers=HEADERS, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def parse_higgsfield_community(max_items: int | None = None):
    """
    Парсит higgsfield.ai/community через REST API.
    Все данные (промпт, модель, референсы, результат) берутся из API-ответа.
    Посты без промпта пропускаются.
    """
    output_dir = Path("higgsfield_data_v3")
    output_dir.mkdir(exist_ok=True)

    results = []
    processed_ids = set()
    skipped_no_prompt = 0
    cursor = None
    page_num = 0

    print("=== Higgsfield Parser v3 (REST API) ===\n")

    while True:
        if max_items and len(results) >= max_items:
            print(f"\n✓ Достигнут лимит: {max_items}")
            break

        page_num += 1
        print(f"--- Страница {page_num} (cursor={str(cursor)[:30] if cursor else 'start'}) ---")

        try:
            data = fetch_page(cursor=cursor)
        except Exception as e:
            print(f"! Ошибка запроса: {e}")
            break

        items = data.get("items", [])
        has_more = data.get("has_more", False)
        cursor = data.get("cursor")

        print(f"  Получено: {len(items)} постов | has_more={has_more}")

        for item in items:
            if max_items and len(results) >= max_items:
                break

            pub = item.get("publication") or {}
            pub_id = pub.get("id") or item.get("id") or ""
            if pub_id in processed_ids:
                continue
            processed_ids.add(pub_id)

            params = item.get("params") or {}
            prompt = (params.get("prompt") or "").strip()

            # Пропускаем посты без промпта
            if not prompt or len(prompt) < 10:
                skipped_no_prompt += 1
                continue

            # Модель
            model_name = item.get("job_set_type") or item.get("model") or None

            # Основное изображение результата
            res = item.get("results") or {}
            raw = res.get("raw") or {}
            main_image_url = raw.get("url") or None

            if not main_image_url:
                skipped_no_prompt += 1
                continue

            # Референсные изображения
            input_images = params.get("input_images") or []
            reference_urls = [
                img["url"]
                for img in input_images
                if isinstance(img, dict) and img.get("url")
            ]

            # Создаём папку
            post_dir = output_dir / f"post_{len(results):04d}"
            post_dir.mkdir(exist_ok=True)

            post_data = {
                "id": len(results),
                "publication_id": pub_id,
                "folder": str(post_dir),
                "main_image_url": main_image_url,
                "main_image_filename": None,
                "prompt": prompt,
                "model_name": model_name,
                "reference_images": [],
            }

            print(f"\n[{len(results) + 1}] id={pub_id[:8]}... | модель={model_name} | "
                  f"промпт={len(prompt)}ч | референсов={len(reference_urls)}")

            # Скачиваем основное изображение
            # Определяем расширение из URL
            ext = "webp"
            if main_image_url:
                url_path = main_image_url.split("?")[0]
                if url_path.endswith(".jpg") or url_path.endswith(".jpeg"):
                    ext = "jpg"
                elif url_path.endswith(".png"):
                    ext = "png"
            img_path = post_dir / f"result.{ext}"
            if download_image(main_image_url, str(img_path)):
                post_data["main_image_filename"] = f"result.{ext}"
                print(f"  ✓ Результат скачан")

            # Скачиваем референсы
            for ref_idx, ref_url in enumerate(reference_urls):
                ref_ext = "jpg"
                ref_path_str = ref_url.split("?")[0]
                if ref_path_str.endswith(".png"):
                    ref_ext = "png"
                elif ref_path_str.endswith(".webp"):
                    ref_ext = "webp"
                ref_filename = f"reference_{ref_idx}.{ref_ext}"
                ref_path = post_dir / ref_filename
                if download_image(ref_url, str(ref_path)):
                    post_data["reference_images"].append({
                        "url": ref_url,
                        "filename": ref_filename,
                    })

            if reference_urls:
                print(f"  ✓ Референсов скачано: {len(post_data['reference_images'])}/{len(reference_urls)}")

            # Сохраняем JSON
            json_path = post_dir / "data.json"
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(post_data, f, ensure_ascii=False, indent=2)

            results.append(post_data)

        print(f"\n✓ Сохранено: {len(results)} | Пропущено (нет промпта/изображения): {skipped_no_prompt}")

        if not has_more or not cursor:
            print("\n✓ Конец ленты")
            break

        # Небольшая пауза между запросами
        time.sleep(0.5)

    # Сохраняем индекс
    index_file = output_dir / "index.json"
    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # Статистика по моделям
    model_stats: dict[str, int] = {}
    for post in results:
        m = post.get("model_name") or "Unknown"
        model_stats[m] = model_stats.get(m, 0) + 1

    print(f"\n{'='*60}")
    print(f"✓ ГОТОВО!")
    print(f"✓ Постов сохранено: {len(results)}")
    print(f"✓ Пропущено (нет промпта/изображения): {skipped_no_prompt}")
    print(f"✓ Папка: {output_dir}/")
    print(f"\n=== Статистика по моделям ===")
    for model, count in sorted(model_stats.items(), key=lambda x: -x[1]):
        print(f"  {model}: {count} постов")
    print(f"{'='*60}")

    return results


if __name__ == "__main__":
    MAX_ITEMS = None  # None = без ограничений

    results = parse_higgsfield_community(max_items=MAX_ITEMS)
