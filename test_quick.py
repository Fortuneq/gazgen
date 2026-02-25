"""Quick test: open modal, check Recreate button, open new tab, find ref images"""
import sys
import time
sys.stdout.reconfigure(line_buffering=True)

from playwright.sync_api import sync_playwright

print('Starting...', flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()

    print('Navigating...', flush=True)
    page.goto('https://higgsfield.ai/community/', wait_until='domcontentloaded', timeout=60000)
    print('Page loaded, sleeping 10s...', flush=True)
    time.sleep(10)

    try:
        cb = page.locator('#cookiescript_accept').first
        if cb.is_visible(timeout=2000):
            cb.click()
            print('Cookie clicked', flush=True)
    except:
        pass

    page.evaluate("""
        const w = document.getElementById('cookiescript_injected_wrapper');
        if (w) w.remove();
    """)

    try:
        page.wait_for_selector('div[role="grid"]', timeout=60000)
        print('Grid loaded!', flush=True)
    except Exception as e:
        print(f'Grid failed: {e}', flush=True)
        browser.close()
        sys.exit(1)

    time.sleep(2)
    cells = page.locator('div[role="gridcell"]').all()
    print(f'Found {len(cells)} gridcells', flush=True)

    # Test first few cells
    for i, cell in enumerate(cells[:5]):
        print(f'\n--- Cell {i} ---', flush=True)
        try:
            aside = cell.locator('aside.relative.group').first
            aside.scroll_into_view_if_needed()
            time.sleep(0.3)
            page.evaluate("""const w = document.getElementById('cookiescript_injected_wrapper'); if (w) w.remove();""")
            button = aside.locator('button.absolute.inset-0').first
            button.click(timeout=8000)
            time.sleep(2)

            try:
                page.wait_for_selector('[role="dialog"]', timeout=5000)
                print('  Dialog opened!', flush=True)
            except:
                print('  No dialog', flush=True)
                continue

            time.sleep(1)

            # Check buttons
            btns = page.evaluate("""
                () => {
                    const d = document.querySelector('[role="dialog"]');
                    if (!d) return [];
                    return Array.from(d.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t.length > 0).slice(0, 8);
                }
            """)
            print(f'  Buttons: {btns}', flush=True)

            # Check prompt
            prompt = page.evaluate("""
                () => {
                    const d = document.querySelector('[role="dialog"]');
                    if (!d) return '';
                    const els = d.querySelectorAll('p.attribute-text-value');
                    let mx = '';
                    els.forEach(el => { if (el.textContent.trim().length > mx.length) mx = el.textContent.trim(); });
                    return mx;
                }
            """)
            print(f'  Prompt len: {len(prompt)}', flush=True)

            if len(prompt) >= 10:
                # Check button HTML and href
                btn_info = page.evaluate("""
                    () => {
                        const d = document.querySelector('[role="dialog"]');
                        if (!d) return null;
                        const btn = Array.from(d.querySelectorAll('button')).find(b => b.textContent.trim() === 'Recreate');
                        if (!btn) return null;
                        // Check if it's inside an anchor
                        const anchor = btn.closest('a');
                        return {
                            btnHtml: btn.outerHTML.substring(0, 200),
                            anchorHref: anchor ? anchor.href : null,
                            anchorTarget: anchor ? anchor.target : null,
                            btnType: btn.type,
                            btnDataAttrs: Object.fromEntries(Array.from(btn.attributes).map(a => [a.name, a.value]))
                        };
                    }
                """)
                print(f'  Recreate btn info: {btn_info}', flush=True)

                recreate = page.locator('[role="dialog"] button:has-text("Recreate")').first
                try:
                    v = recreate.is_visible(timeout=2000)
                    print(f'  Recreate visible: {v}', flush=True)
                    if v:
                        current_url = page.url
                        print(f'  Current URL before click: {current_url[:80]}', flush=True)

                        # Try middle-clicking to force new tab
                        try:
                            with context.expect_page(timeout=5000) as np_info:
                                recreate.click(modifiers=['Meta'])  # Cmd+click = new tab on Mac
                            np = np_info.value
                            print(f'  New tab with Meta+click: {np.url[:80]}', flush=True)
                            np.wait_for_load_state('domcontentloaded', timeout=20000)
                            time.sleep(2)
                            refs = np.locator('img[alt="object image"]').all()
                            print(f'  Refs found: {len(refs)}', flush=True)
                            for r in refs[:3]:
                                src = r.get_attribute('src', timeout=2000)
                                print(f'    src: {src[:80] if src else None}', flush=True)
                            np.close()
                            break
                        except Exception as e1:
                            print(f'  Meta+click failed: {e1}', flush=True)
                            # Try regular click, see where it goes
                            try:
                                recreate.click(timeout=3000)
                                time.sleep(3)
                                new_url = page.url
                                print(f'  URL after regular click: {new_url[:100]}', flush=True)
                                # Find refs on current page
                                refs = page.locator('img[alt="object image"]').all()
                                print(f'  Refs on current page: {len(refs)}', flush=True)
                            except Exception as e2:
                                print(f'  Regular click failed: {e2}', flush=True)

                except Exception as e:
                    print(f'  Recreate error: {e}', flush=True)

            page.keyboard.press('Escape')
            time.sleep(0.5)

        except Exception as e:
            print(f'  Error: {e}', flush=True)
            try:
                page.keyboard.press('Escape')
            except:
                pass

    browser.close()
    print('\nDone!', flush=True)
