"""
Находим точный селектор названия модели в модальном окне Higgsfield
"""
import time
from playwright.sync_api import sync_playwright


def debug():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()
        page.goto("https://higgsfield.ai/community/", wait_until="domcontentloaded", timeout=60000)
        time.sleep(10)

        try:
            cookie_accept = page.locator('#cookiescript_accept').first
            if cookie_accept.is_visible(timeout=3000):
                cookie_accept.click()
                time.sleep(2)
        except:
            pass

        page.wait_for_selector('div[role="grid"]', timeout=30000)
        time.sleep(3)

        # Кликаем на первую карточку
        gridcells = page.locator('div[role="gridcell"]').all()
        button = gridcells[0].locator('button.absolute.inset-0').first
        button.click(timeout=8000)
        time.sleep(3)

        # Дамп всех attribute-* классов
        print("\n=== ВСЕ элементы с 'attribute' в классе ===")
        result = page.evaluate("""
            () => {
                const dialog = document.querySelector('[role="dialog"]');
                if (!dialog) return 'No dialog';
                const allEls = dialog.querySelectorAll('*');
                const results = [];
                allEls.forEach(el => {
                    const cls = el.className || '';
                    if (typeof cls === 'string' && cls.includes('attribute')) {
                        results.push({
                            tag: el.tagName,
                            class: cls.substring(0, 100),
                            text: el.textContent.trim().substring(0, 120),
                            children: el.children.length
                        });
                    }
                });
                return results;
            }
        """)
        for item in result:
            print(f"  <{item['tag']}> class='{item['class']}' children={item['children']} | '{item['text']}'")

        print("\n=== ПОЛНЫЙ HTML диалога (первые 8000 символов) ===")
        html = page.evaluate("""
            () => {
                const dialog = document.querySelector('[role="dialog"]');
                return dialog ? dialog.innerHTML.substring(0, 8000) : 'No dialog';
            }
        """)
        print(html)

        browser.close()


if __name__ == "__main__":
    debug()
