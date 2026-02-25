"""
Debug v3: Focus on posts that have 'reference' in HTML - find the actual selector
Also examine the 'preset-*' images at post [25]
"""
import time
from playwright.sync_api import sync_playwright


def force_remove_cookie(page):
    try:
        page.evaluate("""
            const w = document.getElementById('cookiescript_injected_wrapper');
            if (w) w.remove();
        """)
    except:
        pass


def check():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()

        print("Opening page...")
        page.goto("https://higgsfield.ai/community/", wait_until="domcontentloaded", timeout=60000)
        time.sleep(10)

        try:
            cookie_accept = page.locator('#cookiescript_accept').first
            if cookie_accept.is_visible(timeout=3000):
                cookie_accept.click()
                time.sleep(2)
        except:
            pass
        force_remove_cookie(page)
        time.sleep(1)

        try:
            page.wait_for_selector('div[role="grid"]', timeout=60000)
            print("Grid loaded")
            time.sleep(3)
        except Exception as e:
            print(f"Grid failed: {e}")
            browser.close()
            return

        force_remove_cookie(page)

        # Scroll to find more posts
        for _ in range(5):
            page.evaluate("window.scrollBy(0, 2000)")
            time.sleep(2)
            force_remove_cookie(page)

        gridcells = page.locator('div[role="gridcell"]').all()
        print(f"Total gridcells: {len(gridcells)}")

        # Test posts 5, 10, 25 specifically (based on previous findings)
        for i in [5, 10, 25, 26, 27, 28, 29, 30]:
            if i >= len(gridcells):
                break
            try:
                gridcell = gridcells[i]
                aside = gridcell.locator('aside.relative.group').first
                img = aside.locator('img.object-cover').first
                img_url = img.get_attribute('src')
                if not img_url:
                    continue

                aside.scroll_into_view_if_needed()
                time.sleep(0.5)
                force_remove_cookie(page)

                button = aside.locator('button.absolute.inset-0').first
                button.click(timeout=8000)
                time.sleep(2.5)

                try:
                    page.wait_for_selector('[role="dialog"]', timeout=5000)
                except:
                    print(f"  [{i}] No dialog")
                    continue

                time.sleep(2)

                # Scroll modal
                try:
                    scroll_container = page.locator('[role="dialog"] .hide-scrollbar').first
                    if scroll_container.is_visible(timeout=1000):
                        scroll_container.evaluate("el => el.scrollTo(0, el.scrollHeight)")
                        time.sleep(1)
                        scroll_container.evaluate("el => el.scrollTo(0, 0)")
                        time.sleep(0.5)
                except Exception as e:
                    print(f"  [{i}] Scroll error: {e}")

                # Get detailed modal info
                info = page.evaluate("""
                    () => {
                        const dialog = document.querySelector('[role="dialog"]');
                        if (!dialog) return null;

                        // All images with their attrs
                        const images = Array.from(dialog.querySelectorAll('img')).map(img => ({
                            alt: img.alt || '',
                            src: (img.src || img.getAttribute('data-src') || '').substring(0, 100),
                            className: img.className || ''
                        }));

                        // Find text around word "reference" in HTML
                        const html = dialog.innerHTML;
                        const refIdx = html.toLowerCase().indexOf('reference');
                        const refContext = refIdx >= 0
                            ? html.substring(Math.max(0, refIdx-100), refIdx+200)
                            : null;

                        // Find all attribute-like class names or data attrs
                        const allImgAlts = Array.from(dialog.querySelectorAll('[alt]')).map(el => ({
                            tag: el.tagName,
                            alt: el.getAttribute('alt') || ''
                        }));

                        // Count elements with specific patterns
                        const presetCount = dialog.querySelectorAll('img[alt^="preset"]').length;
                        const attrImageCount = dialog.querySelectorAll('img[alt^="attribute-image"]').length;
                        const refImageCount = Array.from(dialog.querySelectorAll('img')).filter(img =>
                            img.alt && (img.alt.toLowerCase().includes('ref') ||
                                        img.alt.toLowerCase().includes('preset') ||
                                        img.alt.toLowerCase().includes('char'))
                        ).length;

                        return {
                            images,
                            refContext,
                            allImgAlts,
                            presetCount,
                            attrImageCount,
                            refImageCount
                        };
                    }
                """)

                if not info:
                    print(f"  [{i}] No modal info")
                    page.keyboard.press('Escape')
                    time.sleep(0.5)
                    continue

                print(f"\n  [{i}] All images ({len(info['images'])}):")
                for img in info['images']:
                    print(f"       alt={img['alt']!r:<40} src={img['src'][:60]!r}")

                print(f"  [{i}] preset: {info['presetCount']}, attribute-image: {info['attrImageCount']}, ref-like: {info['refImageCount']}")

                if info['refContext']:
                    print(f"  [{i}] 'reference' context in HTML:")
                    # Clean HTML for display
                    ctx = info['refContext'].replace('\n', ' ')[:300]
                    print(f"       ...{ctx}...")

                page.keyboard.press('Escape')
                time.sleep(0.7)

            except Exception as e:
                print(f"  [{i}] Error: {e}")
                try:
                    page.keyboard.press('Escape')
                    time.sleep(0.3)
                except:
                    pass

        browser.close()


check()
