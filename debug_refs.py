"""
Debug: check if reference images appear in modal after scroll+wait
"""
import time
from playwright.sync_api import sync_playwright

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

        # Cookie consent
        try:
            cookie_accept = page.locator('#cookiescript_accept').first
            if cookie_accept.is_visible(timeout=3000):
                print("Closing cookies...")
                cookie_accept.click()
                time.sleep(3)
        except:
            pass

        # Wait for grid
        try:
            page.wait_for_selector('div[role="grid"]', timeout=60000)
            print("Grid loaded")
            time.sleep(3)
        except Exception as e:
            print(f"Grid not loaded: {e}")
            browser.close()
            return

        # Try first few cards to find one with references
        gridcells = page.locator('div[role="gridcell"]').all()
        print(f"Gridcells: {len(gridcells)}")

        found_refs = 0
        tested = 0

        for i, gridcell in enumerate(gridcells[:20]):
            try:
                aside = gridcell.locator('aside.relative.group').first
                img = aside.locator('img.object-cover').first
                img_url = img.get_attribute('src')
                if not img_url:
                    continue

                aside.scroll_into_view_if_needed()
                time.sleep(0.3)

                button = aside.locator('button.absolute.inset-0').first
                button.click(timeout=8000)
                time.sleep(2)  # wait for dialog

                # Check dialog appeared
                try:
                    page.wait_for_selector('[role="dialog"]', timeout=5000)
                except:
                    print(f"  [{i}] No dialog")
                    continue

                # Wait for lazy images
                time.sleep(1.5)

                # Scroll modal
                try:
                    scroll_container = page.locator('[role="dialog"] .hide-scrollbar').first
                    if scroll_container.is_visible(timeout=1000):
                        scroll_container.evaluate("el => el.scrollTo(0, el.scrollHeight)")
                        time.sleep(0.5)
                        scroll_container.evaluate("el => el.scrollTo(0, 0)")
                        time.sleep(0.3)
                except:
                    pass

                # Count reference images
                ref_count_js = page.evaluate("""
                    () => {
                        const dialog = document.querySelector('[role="dialog"]');
                        if (!dialog) return {count: 0, srcs: []};
                        const refs = dialog.querySelectorAll('img[alt^="attribute-image"]');
                        const srcs = Array.from(refs).map(img => ({
                            alt: img.alt,
                            src: img.src || img.getAttribute('data-src') || '',
                            srcset: img.srcset ? img.srcset.substring(0, 80) : ''
                        }));
                        return {count: refs.length, srcs: srcs};
                    }
                """)

                # Also try Playwright locator
                ref_locator_count = page.locator('[role="dialog"] img[alt^="attribute-image"]').count()

                tested += 1
                has_refs = ref_count_js['count'] > 0 or ref_locator_count > 0

                print(f"  [{i}] JS refs: {ref_count_js['count']}, Playwright refs: {ref_locator_count}")
                if ref_count_js['srcs']:
                    for s in ref_count_js['srcs'][:3]:
                        print(f"    alt={s['alt']!r} src={s['src'][:60]!r} srcset={s['srcset']!r}")

                if has_refs:
                    found_refs += 1

                page.keyboard.press('Escape')
                time.sleep(0.5)

                if tested >= 10:
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
        print(f"Posts with refs: {found_refs}")
        if found_refs > 0:
            print("✓ Reference images ARE visible in modal after scroll+wait")
        else:
            print("✗ Reference images still NOT found - may need different selector")

check_refs()
