"""
Test: Recreate button → new tab → img[alt="object image"]
Tests first 20 gridcells, prints ref counts and URLs found.
"""
import time
from playwright.sync_api import sync_playwright


def force_remove_cookie(page):
    try:
        page.evaluate("""
            const w = document.getElementById('cookiescript_injected_wrapper');
            if (w) w.remove();
            const d = document.getElementById('cookiescript_injected');
            if (d) d.remove();
        """)
    except:
        pass


def test_recreate():
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

        gridcells = page.locator('div[role="gridcell"]').all()
        print(f"Total gridcells: {len(gridcells)}")

        tested = 0
        found_refs = 0
        found_prompt = 0

        for i, gridcell in enumerate(gridcells[:20]):
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
                time.sleep(2.5)

                try:
                    page.wait_for_selector('[role="dialog"]', timeout=5000)
                except:
                    print(f"  [{i}] No dialog")
                    continue

                time.sleep(1.5)

                # Check prompt exists
                prompt_data = page.evaluate("""
                    () => {
                        const dialog = document.querySelector('[role="dialog"]');
                        if (!dialog) return null;
                        const els = dialog.querySelectorAll('p.attribute-text-value');
                        let maxTxt = '';
                        els.forEach(el => {
                            const txt = el.textContent.trim();
                            if (txt.length > maxTxt.length) maxTxt = txt;
                        });
                        return maxTxt || null;
                    }
                """)

                if not prompt_data or len(prompt_data) < 10:
                    print(f"  [{i}] No prompt — skipping")
                    page.keyboard.press('Escape')
                    time.sleep(0.5)
                    continue

                found_prompt += 1
                print(f"\n  [{i}] Prompt: {prompt_data[:80]}...")

                # Try to find and click Recreate button
                recreate_btn = page.locator('[role="dialog"] button:has-text("Recreate")').first
                btn_visible = False
                try:
                    btn_visible = recreate_btn.is_visible(timeout=2000)
                except:
                    pass

                print(f"  [{i}] Recreate button visible: {btn_visible}")

                if btn_visible:
                    try:
                        with context.expect_page() as new_page_info:
                            recreate_btn.click()
                        new_page = new_page_info.value
                        print(f"  [{i}] New tab opened: {new_page.url[:80]}")

                        try:
                            new_page.wait_for_load_state('domcontentloaded', timeout=20000)
                            time.sleep(2)

                            ref_locs = new_page.locator('img[alt="object image"]').all()
                            ref_urls = []
                            for ref_loc in ref_locs:
                                try:
                                    src = ref_loc.get_attribute('src', timeout=2000)
                                    if src and src.startswith('http'):
                                        ref_urls.append(src)
                                except:
                                    pass

                            print(f"  [{i}] img[alt='object image'] count: {len(ref_urls)}")
                            for url in ref_urls:
                                print(f"       {url[:90]}")

                            if ref_urls:
                                found_refs += 1

                        except Exception as e:
                            print(f"  [{i}] Error in new tab: {e}")
                        finally:
                            new_page.close()

                    except Exception as e:
                        print(f"  [{i}] Recreate click error: {e}")
                else:
                    # Try to find what buttons ARE in dialog
                    btns = page.evaluate("""
                        () => {
                            const dialog = document.querySelector('[role="dialog"]');
                            if (!dialog) return [];
                            return Array.from(dialog.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t.length > 0);
                        }
                    """)
                    print(f"  [{i}] Buttons in dialog: {btns[:5]}")

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
        print(f"Posts with prompt: {found_prompt}")
        print(f"Posts where Recreate found refs: {found_refs}")


test_recreate()
