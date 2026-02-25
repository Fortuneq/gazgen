"""
Отладка: смотрим HTML модалки чтобы найти селекторы промпта и названия модели
"""
import time
from playwright.sync_api import sync_playwright


def debug_modal():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()
        page.goto("https://higgsfield.ai/community/", wait_until="domcontentloaded", timeout=60000)
        time.sleep(10)

        # Cookie consent
        try:
            cookie_accept = page.locator('#cookiescript_accept').first
            if cookie_accept.is_visible(timeout=3000):
                cookie_accept.click()
                time.sleep(2)
        except:
            pass

        page.wait_for_selector('div[role="grid"]', timeout=15000)
        time.sleep(3)

        # Кликаем на первую карточку
        gridcells = page.locator('div[role="gridcell"]').all()
        print(f"Найдено gridcell: {len(gridcells)}")

        for i, gridcell in enumerate(gridcells[:5]):
            try:
                button = gridcell.locator('button.absolute.inset-0').first
                img = gridcell.locator('img.object-cover').first
                img_url = img.get_attribute('src', timeout=3000)
                if not img_url:
                    continue

                print(f"\n=== Карточка {i} ===")
                print(f"IMG URL: {img_url[:80]}...")

                button.click(timeout=8000)
                time.sleep(3)

                # Ищем модалку
                # Пробуем разные варианты
                modal_selectors = [
                    'dialog',
                    '[role="dialog"]',
                    '[data-state="open"]',
                    '.fixed.inset-0',
                    '[class*="modal"]',
                    '[class*="Modal"]',
                    '[class*="dialog"]',
                    '[class*="Dialog"]',
                    '[class*="overlay"]',
                ]

                modal = None
                for sel in modal_selectors:
                    try:
                        el = page.locator(sel).first
                        if el.is_visible(timeout=1000):
                            print(f"✓ Модалка найдена: {sel}")
                            modal = el
                            break
                    except:
                        pass

                if modal:
                    # Печатаем текст модалки
                    modal_text = modal.inner_text()
                    print(f"\n--- Текст модалки ---\n{modal_text[:2000]}")

                    # Пробуем найти промпт
                    prompt_candidates = [
                        'p', 'textarea', 'pre',
                        '[class*="prompt"]', '[class*="Prompt"]',
                        '[class*="description"]', '[class*="Description"]',
                        '[class*="text"]',
                    ]
                    print("\n--- Элементы в модалке ---")
                    for sel in prompt_candidates:
                        try:
                            els = modal.locator(sel).all()
                            for j, el in enumerate(els[:3]):
                                txt = el.inner_text().strip()
                                if txt and len(txt) > 20:
                                    classes = el.get_attribute('class') or ''
                                    print(f"[{sel}][{j}] class='{classes[:60]}': {txt[:150]}")
                        except:
                            pass

                    # Ищем название модели
                    print("\n--- Название модели ---")
                    model_candidates = [
                        '[class*="model"]', '[class*="Model"]',
                        'span', 'badge', '[class*="badge"]',
                        '[class*="tag"]', '[class*="chip"]',
                        'h1', 'h2', 'h3',
                    ]
                    for sel in model_candidates:
                        try:
                            els = modal.locator(sel).all()
                            for j, el in enumerate(els[:5]):
                                txt = el.inner_text().strip()
                                if txt and len(txt) < 50:
                                    classes = el.get_attribute('class') or ''
                                    print(f"[{sel}][{j}] class='{classes[:60]}': {txt}")
                        except:
                            pass
                else:
                    # Модалка не найдена, печатаем весь HTML страницы
                    print("Модалка не найдена через стандартные селекторы")
                    print("\n--- Всё видимое на странице ---")
                    body_text = page.locator('body').inner_text()
                    print(body_text[3000:5000])  # Берём середину (после grid)

                page.keyboard.press('Escape')
                time.sleep(1)
                break  # Достаточно одной карточки

            except Exception as e:
                print(f"Ошибка: {e}")
                continue

        print("\n\n=== Готово ===")
        input("Нажми Enter чтобы закрыть браузер...")
        browser.close()


if __name__ == "__main__":
    debug_modal()
