"""
Test: Intercept window.open call from Recreate button to get target URL
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

    # Track all new pages
    new_pages = []
    context.on('page', lambda p: new_pages.append(p))

    page.goto(POST_URL, wait_until='domcontentloaded', timeout=60000)
    time.sleep(8)

    print(f'URL: {page.url}', flush=True)
    print(f'Title: {page.title()}', flush=True)

    # Try to remove cookie banner safely
    try:
        page.evaluate("""
            const w = document.getElementById('cookiescript_injected_wrapper');
            if (w) w.remove();
            const d = document.getElementById('cookiescript_injected');
            if (d) d.remove();
        """)
        print('Cookie banner removed', flush=True)
    except Exception as e:
        print(f'Cookie remove error: {e}', flush=True)
        # Try waiting for page to settle
        try:
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(2)
        except:
            pass
        try:
            page.evaluate("""
                const w = document.getElementById('cookiescript_injected_wrapper');
                if (w) w.remove();
            """)
        except:
            pass

    # Inject window.open interceptor
    try:
        page.evaluate("""
            window._openCalls = [];
            const origOpen = window.open;
            window.open = function(url, target, features) {
                console.log('window.open called:', url, target);
                window._openCalls.push({url: url, target: target, features: features});
                return origOpen.apply(this, arguments);
            };
            console.log('window.open intercepted');
        """)
        print('window.open intercepted', flush=True)
    except Exception as e:
        print(f'Intercept error: {e}', flush=True)

    # Find and check Recreate button
    recreate = page.locator('button:has-text("Recreate")').first
    try:
        vis = recreate.is_visible(timeout=5000)
        print(f'Recreate visible: {vis}', flush=True)
    except Exception as e:
        print(f'Recreate not found: {e}', flush=True)
        vis = False

    if vis:
        print('Clicking Recreate...', flush=True)

        # Capture popup
        try:
            with page.expect_popup(timeout=10000) as popup_info:
                recreate.click()
            popup = popup_info.value
            popup_url = popup.url
            print(f'POPUP caught! URL: {popup_url}', flush=True)
            popup.wait_for_load_state('domcontentloaded', timeout=20000)
            time.sleep(3)
            print(f'Popup final URL: {popup.url}', flush=True)

            # Look for reference images
            refs = popup.locator('img[alt="object image"]').all()
            print(f'img[alt="object image"]: {len(refs)}', flush=True)

            all_imgs = popup.evaluate("""
                () => Array.from(document.querySelectorAll('img')).map(i => ({
                    alt: i.alt || '',
                    src: i.src.substring(0, 80)
                }))
            """)
            print(f'All popup images: {all_imgs[:5]}', flush=True)

            popup.close()

        except Exception as e:
            print(f'expect_popup failed: {e}', flush=True)
            print(f'Current URL: {page.url}', flush=True)
            print(f'New pages in context: {len(new_pages)}', flush=True)

            # Check intercepted calls
            time.sleep(2)
            try:
                calls = page.evaluate("window._openCalls || []")
                print(f'window.open calls: {calls}', flush=True)
            except Exception as e2:
                print(f'Could not read _openCalls: {e2}', flush=True)

            if new_pages:
                print(f'New pages: {len(new_pages)}', flush=True)
                for np in new_pages:
                    try:
                        print(f'  Page URL: {np.url}', flush=True)
                    except:
                        pass

    browser.close()
    print('Done!', flush=True)
