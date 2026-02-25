"""
Отладка: ищем точный селектор для названия модели в секции INFORMATION
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
        button = gridcells[0].locator('button.absolute.inset-0').first
        button.click(timeout=8000)
        time.sleep(3)

        modal = page.locator('[role="dialog"]').first

        print("\n=== ВСЕ p.attribute-text-value ===")
        els = modal.locator('p.attribute-text-value').all()
        for i, el in enumerate(els):
            txt = el.inner_text().strip()
            cls = el.get_attribute('class') or ''
            print(f"[{i}] len={len(txt)} | class='{cls}' | text='{txt[:120]}'")

        print("\n=== Ищем секцию INFORMATION ===")
        # Пробуем найти контейнер с моделью через текст "Model"
        try:
            # Ищем элемент, содержащий "Model" как точный текст
            model_labels = page.locator('[role="dialog"] *').filter(has_text="Model").all()
            for i, el in enumerate(model_labels[:10]):
                tag = el.evaluate("el => el.tagName")
                cls = el.get_attribute('class') or ''
                txt = el.inner_text().strip()[:100]
                print(f"  [{i}] <{tag}> class='{cls[:50]}' | '{txt}'")
        except Exception as e:
            print(f"Ошибка: {e}")

        print("\n=== JavaScript: дамп всех элементов с 'Nano' или 'Model' ===")
        result = page.evaluate("""
            () => {
                const dialog = document.querySelector('[role="dialog"]');
                if (!dialog) return 'No dialog';
                const allEls = dialog.querySelectorAll('*');
                const results = [];
                allEls.forEach(el => {
                    const txt = el.textContent.trim();
                    if ((txt.includes('Nano') || txt === 'Model') && txt.length < 200) {
                        results.push({
                            tag: el.tagName,
                            class: el.className,
                            text: txt.substring(0, 100),
                            parent_class: el.parentElement?.className || ''
                        });
                    }
                });
                return results;
            }
        """)
        print(result)

        print("\n=== INFORMATION секция HTML ===")
        info_html = page.evaluate("""
            () => {
                const dialog = document.querySelector('[role="dialog"]');
                // Ищем секцию INFORMATION
                const allEls = dialog.querySelectorAll('*');
                for (const el of allEls) {
                    if (el.textContent.trim().startsWith('INFORMATION') && el.children.length > 0) {
                        return el.outerHTML.substring(0, 3000);
                    }
                }
                return 'Not found';
            }
        """)
        print(info_html)

        browser.close()


if __name__ == "__main__":
    debug_modal()
