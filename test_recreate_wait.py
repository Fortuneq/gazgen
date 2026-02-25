"""
Test: Wait for the new tab to navigate away from about:blank
"""
import sys
import time
sys.stdout.reconfigure(line_buffering=True)

from playwright.sync_api import sync_playwright

POST_URL = "https://higgsfield.ai/community/0e7838d1-3e23-4db8-8260-81f48ab7c180"

print(f'Testing: {POST_URL}', flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=['--disable-popup-blocking']
    )
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )

    new_pages = []
    context.on('page', lambda pg: new_pages.append(pg))

    page = context.new_page()
    page.goto(POST_URL, wait_until='domcontentloaded', timeout=60000)
    time.sleep(8)

    print(f'URL: {page.url}', flush=True)

    try:
        page.evaluate("""
            const w = document.getElementById('cookiescript_injected_wrapper');
            if (w) w.remove();
        """)
    except:
        pass

    recreate = page.locator('button:has-text("Recreate")').first
    try:
        vis = recreate.is_visible(timeout=5000)
        print(f'Recreate visible: {vis}', flush=True)
    except:
        vis = False

    if vis:
        print('Clicking Recreate...', flush=True)

        # Use context.expect_page which waits for the new page
        try:
            with context.expect_page(timeout=15000) as new_page_info:
                recreate.click()
            np = new_page_info.value
            print(f'New page initial URL: {np.url}', flush=True)

            # Wait for it to navigate away from about:blank
            print('Waiting for page to load...', flush=True)
            try:
                # Wait for navigation to complete (not about:blank)
                np.wait_for_load_state('domcontentloaded', timeout=30000)
            except Exception as e:
                print(f'Wait load error: {e}', flush=True)

            # Wait additional time for JS/SPA navigation
            for i in range(10):
                time.sleep(2)
                url = np.url
                print(f'  [{i}] URL: {url}', flush=True)
                if url != 'about:blank':
                    print(f'  Navigated to: {url}', flush=True)
                    break

            time.sleep(3)
            final_url = np.url
            print(f'Final URL: {final_url}', flush=True)

            # Get page info
            try:
                info = np.evaluate("""
                    () => ({
                        title: document.title,
                        url: window.location.href,
                        imgs: Array.from(document.querySelectorAll('img')).map(i => ({
                            alt: i.alt || '',
                            src: i.src.substring(0, 100)
                        })).slice(0, 10),
                        html_preview: document.body ? document.body.innerHTML.substring(0, 500) : 'no body'
                    })
                """)
                print(f'Title: {info["title"]}', flush=True)
                print(f'Images: {info["imgs"]}', flush=True)
                print(f'HTML preview: {info["html_preview"][:200]}', flush=True)
            except Exception as e:
                print(f'Eval error: {e}', flush=True)

            # Check for refs
            refs = np.locator('img[alt="object image"]').all()
            print(f'img[alt="object image"]: {len(refs)}', flush=True)

            np.close()

        except Exception as e:
            print(f'context.expect_page failed: {e}', flush=True)
            print(f'Main page URL: {page.url}', flush=True)
            print(f'New pages from listener: {len(new_pages)}', flush=True)
            for np in new_pages:
                try:
                    print(f'  Page URL: {np.url}', flush=True)
                    time.sleep(10)
                    print(f'  Page URL after 10s: {np.url}', flush=True)
                except Exception as e2:
                    print(f'  Page error: {e2}', flush=True)

    browser.close()
    print('Done!', flush=True)
