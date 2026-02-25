"""
Test: Use page.expect_popup() to catch Recreate window
"""
import sys
import time
sys.stdout.reconfigure(line_buffering=True)

from playwright.sync_api import sync_playwright

POST_URL = "https://higgsfield.ai/community/0e7838d1-3e23-4db8-8260-81f48ab7c180"

print(f'Testing: {POST_URL}', flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    page = context.new_page()

    # Register popup handler early
    popups = []
    page.on('popup', lambda popup: popups.append(popup))

    page.goto(POST_URL, wait_until='domcontentloaded', timeout=30000)
    time.sleep(5)

    # Remove cookie
    try:
        cb = page.locator('#cookiescript_accept').first
        if cb.is_visible(timeout=2000):
            cb.click()
            time.sleep(1)
    except:
        pass
    page.evaluate("const w = document.getElementById('cookiescript_injected_wrapper'); if (w) w.remove();")

    # Find Recreate button
    recreate = page.locator('button:has-text("Recreate")').first
    vis = recreate.is_visible(timeout=3000)
    print(f'Recreate visible: {vis}', flush=True)

    if vis:
        print('Clicking Recreate with popup handler...', flush=True)

        try:
            with page.expect_popup(timeout=10000) as popup_info:
                recreate.click()
            popup = popup_info.value
            print(f'Popup caught! URL: {popup.url}', flush=True)
            popup.wait_for_load_state('domcontentloaded', timeout=20000)
            time.sleep(3)
            print(f'Popup final URL: {popup.url}', flush=True)

            # Find reference images
            refs = popup.locator('img[alt="object image"]').all()
            print(f'img[alt="object image"]: {len(refs)}', flush=True)

            # Show all images
            all_imgs = popup.evaluate("""
                () => Array.from(document.querySelectorAll('img')).map(i => ({
                    alt: i.alt || '',
                    src: i.src.substring(0, 80)
                }))
            """)
            print(f'All images: {all_imgs[:10]}', flush=True)

            # Check page HTML for hints
            page_info = popup.evaluate("""
                () => ({
                    title: document.title,
                    h1: document.querySelector('h1') ? document.querySelector('h1').textContent : null,
                    buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).slice(0, 10)
                })
            """)
            print(f'Popup page: title={page_info["title"]}, h1={page_info["h1"]}', flush=True)
            print(f'Buttons: {page_info["buttons"]}', flush=True)

            popup.close()

        except Exception as e:
            print(f'expect_popup failed: {e}', flush=True)
            print(f'Current URL: {page.url}', flush=True)
            print(f'Popups caught by listener: {len(popups)}', flush=True)

            if popups:
                pop = popups[0]
                print(f'Popup URL: {pop.url}', flush=True)
                time.sleep(3)
                print(f'Popup final URL: {pop.url}', flush=True)
                refs = pop.locator('img[alt="object image"]').all()
                print(f'Refs: {len(refs)}', flush=True)

    browser.close()
    print('Done!', flush=True)
