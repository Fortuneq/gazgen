"""
Парсер для сайта higgsfield.ai/community (v2 FINAL)
Правильный подход: отслеживание по URL изображений
"""
import json
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright
import requests


def download_image(url: str, save_path: str) -> bool:
    """Скачивает изображение по URL"""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        with open(save_path, 'wb') as f:
            f.write(response.content)
        return True
    except Exception as e:
        print(f"Ошибка при скачивании: {e}")
        return False


def parse_higgsfield_community(headless: bool = False, max_items: int = None):
    """
    Парсит higgsfield.ai/community
    Отслеживает по URL изображений, а не по индексам DOM
    """
    output_dir = Path("higgsfield_data_v2")
    output_dir.mkdir(exist_ok=True)

    results = []
    processed_urls = set()  # Отслеживаем обработанные URL изображений

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()

        print("Открываем страницу...")
        page.goto("https://higgsfield.ai/community/", wait_until="load")
        time.sleep(8)

        # Cookie consent
        try:
            cookie_accept = page.locator('#cookiescript_accept').first
            if cookie_accept.is_visible(timeout=3000):
                print("Закрываем cookie consent...")
                cookie_accept.click()
                time.sleep(3)
        except:
            pass

        # Ждем grid
        try:
            page.wait_for_selector('div[role="grid"]', timeout=15000)
            print("✓ Grid загружен")
            time.sleep(3)
        except:
            print("⚠ Grid не загрузился!")
            browser.close()
            return []

        print("\n=== Начинаем парсинг ===\n")

        scroll_iteration = 0
        no_new_items_count = 0

        while True:
            # Проверяем лимит
            if max_items and len(results) >= max_items:
                print(f"\n✓ Достигнут лимит: {max_items}")
                break

            print(f"\n--- Итерация {scroll_iteration + 1} ---")

            # Находим ВСЕ видимые gridcell элементы
            gridcells = page.locator('div[role="gridcell"]').all()
            print(f"Видимых gridcell: {len(gridcells)}")

            new_items = 0

            for gridcell in gridcells:
                # Проверяем лимит
                if max_items and len(results) >= max_items:
                    break

                try:
                    # Ищем aside внутри gridcell
                    aside = gridcell.locator('aside.relative.group').first

                    # Ищем изображение
                    img = aside.locator('img.object-cover').first
                    if not img:
                        continue

                    # Получаем URL изображения (уникальный ID)
                    img_url = img.get_attribute('src')
                    if not img_url or img_url in processed_urls:
                        continue  # Уже обработали

                    print(f"\n[{len(results) + 1}] Новый пост найден")

                    # Скроллим к элементу
                    aside.scroll_into_view_if_needed()
                    time.sleep(0.3)

                    # Создаем папку
                    post_dir = output_dir / f"post_{len(results):04d}"
                    post_dir.mkdir(exist_ok=True)

                    data = {
                        'id': len(results),
                        'folder': str(post_dir),
                        'main_image_url': img_url,
                        'main_image_filename': None,
                        'prompt': None,
                        'reference_images': []
                    }

                    # Скачиваем основное изображение
                    print(f"  ✓ Изображение")
                    img_path = post_dir / "result.webp"
                    if download_image(img_url, str(img_path)):
                        data['main_image_filename'] = "result.webp"

                    # Промпт из alt или figcaption
                    try:
                        prompt_text = img.get_attribute('alt')
                        if not prompt_text or prompt_text == "":
                            figcaption = aside.locator('figcaption').first
                            prompt_text = figcaption.inner_text()

                        if prompt_text:
                            data['prompt'] = prompt_text
                            print(f"  ✓ Промпт: {len(prompt_text)} символов")
                    except:
                        pass

                    # Кликаем для открытия модалки
                    try:
                        button = aside.locator('button.absolute.inset-0').first
                        button.click(timeout=8000)
                        time.sleep(2)

                        # Извлекаем ВСЕ референсы
                        ref_images = page.locator('img[alt^="attribute-image"]').all()

                        if len(ref_images) > 0:
                            print(f"  ✓ Референсов: {len(ref_images)}")

                            for ref_idx, ref_img in enumerate(ref_images):
                                try:
                                    ref_img_src = ref_img.get_attribute('src')
                                    if not ref_img_src:
                                        srcset = ref_img.get_attribute('srcset')
                                        if srcset:
                                            ref_img_src = srcset.split(',')[-1].strip().split(' ')[0]

                                    if ref_img_src:
                                        ref_filename = f"reference_{ref_idx}.webp"
                                        ref_path = post_dir / ref_filename

                                        if download_image(ref_img_src, str(ref_path)):
                                            data['reference_images'].append({
                                                'url': ref_img_src,
                                                'filename': ref_filename
                                            })
                                except:
                                    pass

                        # Закрываем
                        page.keyboard.press('Escape')
                        time.sleep(0.5)

                    except Exception as e:
                        print(f"  ⚠ Модалка: {e}")

                    # Сохраняем JSON
                    json_path = post_dir / "data.json"
                    with open(json_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)

                    results.append(data)
                    processed_urls.add(img_url)
                    new_items += 1

                except Exception as e:
                    print(f"  ✗ Ошибка: {e}")
                    continue

            print(f"\n✓ Обработано новых: {new_items}")
            print(f"✓ Всего постов: {len(results)}")

            # Скроллинг
            if new_items == 0:
                no_new_items_count += 1
                if no_new_items_count >= 3:
                    print("\n✓ Конец страницы")
                    break
                print("Скроллим...")
                page.evaluate("window.scrollBy(0, 1000)")
                time.sleep(3)
            else:
                no_new_items_count = 0
                page.evaluate("window.scrollBy(0, 500)")
                time.sleep(2)

            scroll_iteration += 1

            if scroll_iteration >= 100:
                print("\n⚠ Лимит итераций")
                break

        browser.close()

    # Индекс
    index_file = output_dir / "index.json"
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"✓ ГОТОВО!")
    print(f"✓ Постов: {len(results)}")
    print(f"✓ Папка: {output_dir}/")
    print(f"{'='*60}")

    return results


if __name__ == "__main__":
    HEADLESS = False
    MAX_ITEMS = None

    print("=== Higgsfield Parser v2 FINAL ===")
    print("Отслеживание по URL изображений\n")

    results = parse_higgsfield_community(headless=HEADLESS, max_items=MAX_ITEMS)
