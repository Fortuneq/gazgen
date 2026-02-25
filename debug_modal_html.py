"""
Debug v3: Dump full modal HTML to understand reference image structure
Also scroll deeper in feed to find posts that might have references
"""
import time
from playwright.sync_api import sync_playwright


def force_remove_cookie(page):
    try:
        page.evaluate("""
            const wrapper = document.getElementById('cookiescript_injected_wrapper');
            if (wrapper) wrapper.remove();
            const injected = document.getElementById('cookiescript_injected');
            if (injected) injected.remove();
        """)
    except:
        pass


def check_modal_html():
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

        # Scroll deep to find more posts (those with references)
        print("\nScrolling to load more posts...")
        for _ in range(5):
            page.evaluate("window.scrollBy(0, 2000)")
            time.sleep(2)
            force_remove_cookie(page)

        gridcells = page.locator('div[role="gridcell"]').all()
        print(f"Gridcells after scroll: {len(gridcells)}")

        # Sample from different positions: beginning, middle, end
        indices_to_test = [0, 5, 10, 15, 20, 25, 30]
        indices_to_test = [i for i in indices_to_test if i < len(gridcells)]

        for i in indices_to_test:
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

                time.sleep(2)  # More time for lazy loading

                # Scroll modal
                try:
                    scroll_container = page.locator('[role="dialog"] .hide-scrollbar').first
                    if scroll_container.is_visible(timeout=1000):
                        scroll_container.evaluate("el => el.scrollTo(0, el.scrollHeight)")
                        time.sleep(1)
                        scroll_container.evaluate("el => el.scrollTo(0, 0)")
                        time.sleep(0.5)
                except:
                    pass

                # Dump full modal HTML (first 3000 chars)
                modal_html = page.evaluate("""
                    () => {
                        const dialog = document.querySelector('[role="dialog"]');
                        return dialog ? dialog.innerHTML.substring(0, 3000) : 'NO DIALOG';
                    }
                """)

                # Count all images
                all_images = page.evaluate("""
                    () => {
                        const dialog = document.querySelector('[role="dialog"]');
                        if (!dialog) return [];
                        return Array.from(dialog.querySelectorAll('img')).map(img => ({
                            alt: img.alt || '',
                            src: (img.src || img.getAttribute('data-src') || '').substring(0, 80)
                        }));
                    }
                """)

                # Check for any element with "reference" or "attribute" text
                has_ref_section = page.evaluate("""
                    () => {
                        const dialog = document.querySelector('[role="dialog"]');
                        if (!dialog) return false;
                        const text = dialog.innerHTML.toLowerCase();
                        return {
                            hasAttributeImage: text.includes('attribute-image'),
                            hasReference: text.includes('reference'),
                            hasRefImg: text.includes('ref_img'),
                            allImgAlts: Array.from(dialog.querySelectorAll('img')).map(i => i.alt)
                        };
                    }
                """)

                print(f"\n  [{i}] Images ({len(all_images)}): {[img['alt'] for img in all_images]}")
                print(f"  [{i}] attribute-image: {has_ref_section['hasAttributeImage']}, reference: {has_ref_section['hasReference']}")
                print(f"  [{i}] All img alts: {has_ref_section['allImgAlts']}")

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


check_modal_html()
