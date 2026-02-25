"""
Test: Disable popup blocking to catch Recreate's new window
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
    # Allow all popups
    context.grant_permissions([])

    new_pages = []
    context.on('page', lambda pg: new_pages.append(pg))

    page = context.new_page()

    page.goto(POST_URL, wait_until='domcontentloaded', timeout=60000)
    time.sleep(8)

    print(f'URL: {page.url}', flush=True)

    # Remove cookie banner
    try:
        page.evaluate("""
            const w = document.getElementById('cookiescript_injected_wrapper');
            if (w) w.remove();
            const d = document.getElementById('cookiescript_injected');
            if (d) d.remove();
        """)
    except Exception as e:
        print(f'Cookie error: {e}', flush=True)

    # Intercept dynamic anchor creation
    try:
        page.evaluate("""
            // Intercept dynamic anchor clicks
            window._anchorUrls = [];
            const origCreateElement = document.createElement.bind(document);
            document.createElement = function(tag) {
                const el = origCreateElement(tag);
                if (tag.toLowerCase() === 'a') {
                    const origClick = el.click.bind(el);
                    el.click = function() {
                        console.log('Dynamic a.click:', el.href, el.target);
                        window._anchorUrls.push({href: el.href, target: el.target});
                        return origClick();
                    };
                }
                return el;
            };
            console.log('createElement intercepted');
        """)
    except Exception as e:
        print(f'Intercept error: {e}', flush=True)

    # Find Recreate button
    recreate = page.locator('button:has-text("Recreate")').first
    try:
        vis = recreate.is_visible(timeout=5000)
        print(f'Recreate visible: {vis}', flush=True)
    except Exception as e:
        print(f'Not visible: {e}', flush=True)
        vis = False

    if vis:
        print('Clicking Recreate (popup unblocked)...', flush=True)
        recreate.click()
        time.sleep(5)

        print(f'URL after click: {page.url}', flush=True)
        print(f'New pages in context: {len(new_pages)}', flush=True)

        # Check anchor interceptions
        try:
            anchors = page.evaluate("window._anchorUrls || []")
            print(f'Dynamic anchor clicks: {anchors}', flush=True)
        except Exception as e:
            print(f'Anchor check error: {e}', flush=True)

        for np in new_pages:
            try:
                np.wait_for_load_state('domcontentloaded', timeout=10000)
                time.sleep(2)
                print(f'New page URL: {np.url}', flush=True)
                refs = np.locator('img[alt="object image"]').all()
                print(f'Refs: {len(refs)}', flush=True)

                all_imgs = np.evaluate("""
                    () => Array.from(document.querySelectorAll('img')).map(i => ({
                        alt: i.alt || '', src: i.src.substring(0, 80)
                    }))
                """)
                print(f'Images: {all_imgs[:5]}', flush=True)
                np.close()
            except Exception as e:
                print(f'New page error: {e}', flush=True)

    browser.close()
    print('Done!', flush=True)
