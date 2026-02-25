"""
Test: Open post URL directly, click Recreate, track navigation, find ref images
"""
import sys
import time
sys.stdout.reconfigure(line_buffering=True)

from playwright.sync_api import sync_playwright

POST_URL = "https://higgsfield.ai/community/0e7838d1-3e23-4db8-8260-81f48ab7c180"

print(f'Testing post URL: {POST_URL}', flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    page = context.new_page()

    # Track all navigation events
    navigated_urls = []
    page.on('framenavigated', lambda frame: navigated_urls.append(frame.url) if frame == page.main_frame else None)

    page.goto(POST_URL, wait_until='domcontentloaded', timeout=30000)
    print(f'Page loaded at: {page.url}', flush=True)
    time.sleep(5)

    # Remove cookie banner
    try:
        cb = page.locator('#cookiescript_accept').first
        if cb.is_visible(timeout=2000):
            cb.click()
            time.sleep(1)
    except:
        pass
    page.evaluate("""
        const w = document.getElementById('cookiescript_injected_wrapper');
        if (w) w.remove();
    """)

    # Check what's on the page
    page_info = page.evaluate("""
        () => {
            const h1 = document.querySelector('h1');
            const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t.length > 0);
            const imgs = Array.from(document.querySelectorAll('img')).map(i => ({
                alt: i.alt,
                src: i.src.substring(0, 80)
            }));
            return {
                h1: h1 ? h1.textContent.trim() : null,
                title: document.title,
                buttons: btns.slice(0, 10),
                imgCount: imgs.length,
                imgs: imgs.slice(0, 5),
                hasRecreate: btns.includes('Recreate')
            };
        }
    """)
    print(f'Page title: {page_info["title"]}', flush=True)
    print(f'Buttons: {page_info["buttons"]}', flush=True)
    print(f'Has Recreate: {page_info["hasRecreate"]}', flush=True)
    print(f'Images ({page_info["imgCount"]}): {page_info["imgs"]}', flush=True)

    if page_info["hasRecreate"]:
        print(f'\nClicking Recreate...', flush=True)
        recreate = page.locator('button:has-text("Recreate")').first

        # Try to intercept network and detect navigation
        new_pages = []
        context.on('page', lambda p: new_pages.append(p))

        navigated_urls.clear()
        try:
            # Click with a short wait for navigation
            recreate.click()
            time.sleep(5)  # Wait for any navigation

            print(f'URL after Recreate click: {page.url}', flush=True)
            print(f'Navigated URLs: {navigated_urls}', flush=True)
            print(f'New pages opened: {len(new_pages)}', flush=True)

            # Check for ref images on current page
            refs = page.locator('img[alt="object image"]').all()
            print(f'img[alt="object image"] on page: {len(refs)}', flush=True)

            # Check all images
            all_imgs = page.evaluate("""
                () => Array.from(document.querySelectorAll('img')).map(i => ({
                    alt: i.alt, src: i.src.substring(0, 80)
                })).filter(i => i.alt && !['', 'job media', 'profile picture'].includes(i.alt))
            """)
            print(f'Non-main images: {all_imgs}', flush=True)

        except Exception as e:
            print(f'Error after Recreate: {e}', flush=True)

    else:
        # The post might require login or have a different structure
        # Try going to community page first, open the post, then check URL
        print('\nNo Recreate button. Checking page structure...', flush=True)
        print('URL:', page.url, flush=True)

        # Maybe we need to go to community and click the card
        page.goto('https://higgsfield.ai/community/', wait_until='domcontentloaded', timeout=60000)
        time.sleep(10)
        try:
            cb = page.locator('#cookiescript_accept').first
            if cb.is_visible(timeout=2000):
                cb.click()
                time.sleep(1)
        except:
            pass
        page.evaluate("const w = document.getElementById('cookiescript_injected_wrapper'); if (w) w.remove();")

        page.wait_for_selector('div[role="grid"]', timeout=60000)
        print('Grid loaded', flush=True)
        time.sleep(3)

        cells = page.locator('div[role="gridcell"]').all()
        print(f'{len(cells)} cells', flush=True)

        # Click first cell with prompt
        for i, cell in enumerate(cells[:10]):
            try:
                aside = cell.locator('aside.relative.group').first
                aside.scroll_into_view_if_needed()
                time.sleep(0.3)
                page.evaluate("const w = document.getElementById('cookiescript_injected_wrapper'); if (w) w.remove();")
                btn = aside.locator('button.absolute.inset-0').first
                btn.click(timeout=8000)
                time.sleep(2)
                page.wait_for_selector('[role="dialog"]', timeout=5000)
                print(f'Cell {i}: dialog at {page.url}', flush=True)

                recreate = page.locator('[role="dialog"] button:has-text("Recreate")').first
                if recreate.is_visible(timeout=2000):
                    # Intercept navigation
                    navigated_urls.clear()
                    new_pages.clear()
                    recreate.click()
                    time.sleep(5)
                    print(f'  URL after click: {page.url}', flush=True)
                    print(f'  Navigations: {navigated_urls}', flush=True)
                    print(f'  New pages: {len(new_pages)}', flush=True)
                    refs = page.locator('img[alt="object image"]').all()
                    print(f'  Ref images: {len(refs)}', flush=True)
                    break

            except Exception as e:
                print(f'Cell {i} error: {e}', flush=True)
                try:
                    page.keyboard.press('Escape')
                except:
                    pass

    browser.close()
    print('\nDone!', flush=True)
