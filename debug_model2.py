"""
Ищем INFORMATION секцию и название модели в модальном окне Higgsfield
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

        print("\n=== JavaScript: всё что есть в диалоге, ищем 'INFORMATION' и 'Model' ===")
        result = page.evaluate("""
            () => {
                const dialog = document.querySelector('[role="dialog"]');
                if (!dialog) return {error: 'No dialog'};

                // Ищем все секции
                const allEls = Array.from(dialog.querySelectorAll('*'));

                // Ищем элемент с текстом INFORMATION
                const infoEl = allEls.find(el =>
                    el.children.length > 0 &&
                    el.textContent.trim().startsWith('INFORMATION')
                );

                // Ищем элементы с текстом "Model" (только этот текст, без дочерних)
                const modelLabels = allEls.filter(el =>
                    el.children.length === 0 &&
                    el.textContent.trim() === 'Model'
                );

                // Ищем все элементы с текстом длиной < 100 в INFORMATION секции
                const infoItems = infoEl ?
                    Array.from(infoEl.querySelectorAll('*')).filter(el =>
                        el.children.length === 0 &&
                        el.textContent.trim().length > 0 &&
                        el.textContent.trim().length < 200
                    ).slice(0, 30) : [];

                return {
                    infoSectionFound: !!infoEl,
                    infoSectionClass: infoEl ? infoEl.className : 'N/A',
                    infoSectionHTML: infoEl ? infoEl.outerHTML.substring(0, 3000) : 'not found',
                    modelLabelCount: modelLabels.length,
                    modelLabels: modelLabels.map(el => ({
                        tag: el.tagName,
                        class: el.className,
                        text: el.textContent.trim(),
                        parentTag: el.parentElement?.tagName,
                        parentClass: el.parentElement?.className,
                        nextSiblingTag: el.nextElementSibling?.tagName,
                        nextSiblingClass: el.nextElementSibling?.className,
                        nextSiblingText: el.nextElementSibling?.textContent?.trim()
                    })),
                    infoItems: infoItems.map(el => ({
                        tag: el.tagName,
                        class: el.className,
                        text: el.textContent.trim()
                    }))
                };
            }
        """)

        print(f"INFORMATION секция найдена: {result.get('infoSectionFound')}")
        print(f"Класс INFORMATION секции: {result.get('infoSectionClass')[:100] if result.get('infoSectionClass') else 'N/A'}")

        print(f"\n=== Метки 'Model' ({result.get('modelLabelCount', 0)} штук) ===")
        for label in result.get('modelLabels', []):
            print(f"  Tag: {label['tag']}, Class: '{label['class'][:60]}'")
            print(f"  Parent: {label['parentTag']} class='{str(label['parentClass'])[:60]}'")
            print(f"  NextSibling: {label['nextSiblingTag']} class='{str(label['nextSiblingClass'])[:60]}' text='{label['nextSiblingText']}'")
            print()

        print("\n=== Элементы в INFORMATION секции ===")
        for item in result.get('infoItems', []):
            print(f"  <{item['tag']}> class='{item['class'][:60]}' | '{item['text']}'")

        print("\n=== HTML INFORMATION секции ===")
        print(result.get('infoSectionHTML', 'not found'))

        browser.close()


if __name__ == "__main__":
    debug()
