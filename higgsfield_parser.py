"""
Парсер для сайта higgsfield.ai/community
Извлекает изображения, промпты и референсные изображения
"""
import json
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
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
        print(f"Ошибка при скачивании {url}: {e}")
        return False


def parse_higgsfield_community(headless: bool = False, max_items: int = None):
    """
    Парсит сайт higgsfield.ai/community

    Args:
        headless: Запускать браузер в headless режиме
        max_items: Максимальное количество элементов для парсинга (None = все)
    """
    # Создаем папки для сохранения
    output_dir = Path("higgsfield_data")
    images_dir = output_dir / "images"
    references_dir = output_dir / "references"

    for directory in [output_dir, images_dir, references_dir]:
        directory.mkdir(exist_ok=True)

    results = []

    with sync_playwright() as p:
        # Запускаем браузер
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()

        print("Открываем страницу...")
        page.goto("https://higgsfield.ai/community/", wait_until="networkidle")

        # Даем время на загрузку динамического контента
        time.sleep(3)

        # Закрываем cookie consent если он есть
        try:
            cookie_accept = page.locator('#cookiescript_accept, button:has-text("Accept"), button:has-text("Принять")').first
            if cookie_accept.is_visible(timeout=5000):
                print("Закрываем cookie consent...")
                cookie_accept.click()
                time.sleep(2)
        except Exception as e:
            print(f"Cookie consent не найден или уже закрыт: {e}")

        # Скроллим страницу вниз для загрузки всех элементов
        print("Скроллим страницу для загрузки всего контента...")
        for _ in range(5):
            try:
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            except:
                pass
            time.sleep(2)

        # Находим все карточки с изображениями
        print("Ищем элементы...")
        # Находим все aside элементы с классом "relative group"
        cards = page.locator('aside.relative.group').all()

        total_items = len(cards)
        if max_items:
            total_items = min(total_items, max_items)

        print(f"Найдено {len(cards)} элементов, обработаем {total_items}")

        for idx in range(total_items):
            try:
                # Получаем карточку заново на каждой итерации
                card = page.locator('aside.relative.group').nth(idx)

                print(f"\n[{idx + 1}/{total_items}] Обработка элемента...")

                # Скроллим к элементу
                card.scroll_into_view_if_needed()
                time.sleep(0.5)

                data = {
                    'id': idx,
                    'main_image_url': None,
                    'main_image_path': None,
                    'prompt': None,
                    'reference_image_url': None,
                    'reference_image_path': None
                }

                # Извлекаем данные из карточки (до клика)
                try:
                    # Ищем изображение внутри карточки
                    img = card.locator('img.object-cover').first
                    main_img_url = img.get_attribute('src')
                    if main_img_url:
                        data['main_image_url'] = main_img_url
                        print(f"  Основное изображение: {main_img_url[:80]}...")

                        # Скачиваем изображение
                        img_filename = f"image_{idx:04d}.webp"
                        img_path = images_dir / img_filename
                        if download_image(main_img_url, str(img_path)):
                            data['main_image_path'] = str(img_path)
                            print(f"  Сохранено: {img_path}")

                    # Пробуем получить промпт из alt или figcaption
                    prompt_text = img.get_attribute('alt')
                    if not prompt_text or prompt_text == "":
                        # Пробуем figcaption
                        try:
                            figcaption = card.locator('figcaption').first
                            prompt_text = figcaption.inner_text()
                        except:
                            prompt_text = None

                    if prompt_text:
                        data['prompt'] = prompt_text
                        print(f"  Промпт: {prompt_text[:100]}...")

                except Exception as e:
                    print(f"  Ошибка при извлечении данных из карточки: {e}")

                # Кликаем на кнопку внутри карточки для открытия модального окна
                try:
                    button = card.locator('button.absolute.inset-0').first
                    button.click(timeout=10000)
                    time.sleep(2)

                    # Извлекаем референсное изображение из модального окна
                    try:
                        ref_img = page.locator('img[alt^="attribute-image"]').first
                        if ref_img.is_visible(timeout=3000):
                            # Получаем src из srcset или src
                            ref_img_src = ref_img.get_attribute('src')
                            if not ref_img_src:
                                srcset = ref_img.get_attribute('srcset')
                                if srcset:
                                    # Берем последний (самый большой) URL из srcset
                                    ref_img_src = srcset.split(',')[-1].strip().split(' ')[0]

                            if ref_img_src:
                                data['reference_image_url'] = ref_img_src
                                print(f"  Референсное изображение: {ref_img_src[:80]}...")

                                # Скачиваем референсное изображение
                                ref_filename = f"reference_{idx:04d}.webp"
                                ref_path = references_dir / ref_filename
                                if download_image(ref_img_src, str(ref_path)):
                                    data['reference_image_path'] = str(ref_path)
                                    print(f"  Сохранено: {ref_path}")
                    except Exception as e:
                        print(f"  Референсное изображение не найдено: {e}")

                    # Закрываем модальное окно
                    page.keyboard.press('Escape')
                    time.sleep(1)

                except Exception as e:
                    print(f"  Ошибка при клике или извлечении данных из модального окна: {e}")

                results.append(data)

            except Exception as e:
                print(f"  Ошибка при обработке элемента {idx}: {e}")
                # Пробуем закрыть модальное окно в случае ошибки
                try:
                    page.keyboard.press('Escape')
                    time.sleep(1)
                except:
                    pass
                continue

        browser.close()

    # Сохраняем результаты в JSON
    output_file = output_dir / "results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"Парсинг завершен!")
    print(f"Обработано элементов: {len(results)}")
    print(f"Результаты сохранены в: {output_file}")
    print(f"Изображения сохранены в: {images_dir}")
    print(f"Референсы сохранены в: {references_dir}")
    print(f"{'='*60}")

    return results


if __name__ == "__main__":
    # Параметры
    HEADLESS = False  # False = браузер будет видимым (так как вы авторизованы)
    MAX_ITEMS = None  # None = все элементы, или укажите число, например 5

    print("Запуск парсера higgsfield.ai/community...")
    print(f"Режим: {'headless' if HEADLESS else 'с отображением браузера'}")
    if MAX_ITEMS:
        print(f"Максимум элементов: {MAX_ITEMS}")
    print()

    results = parse_higgsfield_community(headless=HEADLESS, max_items=MAX_ITEMS)
