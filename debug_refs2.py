"""
Debug v2: Fix cookie banner, check ALL modal images to find reference selectors
"""
import time
from playwright.sync_api import sync_playwright


def force_remove_cookie(page):
    """Force-removes cookie banner via JS"""
    try:
        page.evaluate("""
            const wrapper = document.getElementById('cookiescript_injected_wrapper');
            if (wrapper) wrapper.remove();
            const injected = document.getElementById('cookiescript_injected');
            if (injected) injected.remove();
        """)
    except:
        pass


def check_refs():
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

        # Cookie consent - click and force remove
        try:
            cookie_accept = page.locator('#cookiescript_accept').first
            if cookie_accept.is_visible(timeout=3000):
                print("Closing cookies...")
                cookie_accept.click()
                time.sleep(2)
        except:
            pass
        force_remove_cookie(page)
        time.sleep(1)

        # Wait for grid
        try:
            page.wait_for_selector('div[role="grid"]', timeout=60000)
            print("Grid loaded")
            time.sleep(3)
        except Exception as e:
            print(f"Grid not loaded: {e}")
            browser.close()
            return

        # Force remove cookie again after grid loads
        force_remove_cookie(page)

        gridcells = page.locator('div[role="gridcell"]').all()
        print(f"Gridcells: {len(gridcells)}")

        tested = 0
        found_with_refs = 0

        for i, gridcell in enumerate(gridcells[:15]):
            try:
                aside = gridcell.locator('aside.relative.group').first
                img = aside.locator('img.object-cover').first
                img_url = img.get_attribute('src')
                if not img_url:
                    continue

                aside.scroll_into_view_if_needed()
                time.sleep(0.3)
                force_remove_cookie(page)

                button = aside.locator('button.absolute.inset-0').first
                button.click(timeout=8000)
                time.sleep(2)

                try:
                    page.wait_for_selector('[role="dialog"]', timeout=5000)
                except:
                    print(f"  [{i}] No dialog")
                    page.keyboard.press('Escape')
                    time.sleep(0.3)
                    continue

                # Wait for lazy images
                time.sleep(1.5)

                # Scroll modal to trigger lazy load
                try:
                    scroll_container = page.locator('[role="dialog"] .hide-scrollbar').first
                    if scroll_container.is_visible(timeout=1000):
                        scroll_container.evaluate("el => el.scrollTo(0, el.scrollHeight)")
                        time.sleep(0.7)
                        scroll_container.evaluate("el => el.scrollTo(0, 0)")
                        time.sleep(0.3)
                        print(f"  [{i}] Scrolled modal container")
                except Exception as e:
                    print(f"  [{i}] No scroll container: {e}")

                # Dump ALL images in modal (not just attribute-image)
                all_images = page.evaluate("""
                    () => {
                        const dialog = document.querySelector('[role="dialog"]');
                        if (!dialog) return [];
                        const imgs = Array.from(dialog.querySelectorAll('img'));
                        return imgs.map(img => ({
                            alt: img.alt || '',
                            src: (img.src || img.getAttribute('data-src') || '').substring(0, 80),
                            srcset: img.srcset ? img.srcset.substring(0, 80) : '',
                            class: img.className || ''
                        }));
                    }
                """)

                print(f"\n  [{i}] Modal images ({len(all_images)} total):")
                for img_info in all_images:
                    print(f"    alt={img_info['alt']!r:<30} src={img_info['src'][:50]!r}")

                # Check for attribute-image refs specifically
                ref_count = sum(1 for img in all_images if 'attribute-image' in img['alt'])
                print(f"  [{i}] attribute-image refs: {ref_count}")

                if ref_count > 0:
                    found_with_refs += 1

                tested += 1
                page.keyboard.press('Escape')
                time.sleep(0.7)

                if tested >= 8:
                    break

            except Exception as e:
                print(f"  [{i}] Error: {e}")
                try:
                    page.keyboard.press('Escape')
                    time.sleep(0.3)
                except:
                    pass

        browser.close()

        print(f"\n=== SUMMARY ===")
        print(f"Posts tested: {tested}")
        print(f"Posts with attribute-image refs: {found_with_refs}")


check_refs()
