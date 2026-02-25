"""
Test: Look for reference image data in API responses and page data
"""
import sys
import time
import json
sys.stdout.reconfigure(line_buffering=True)

from playwright.sync_api import sync_playwright

POST_URL = "https://higgsfield.ai/community/0e7838d1-3e23-4db8-8260-81f48ab7c180"

print(f'Testing: {POST_URL}', flush=True)

captured_requests = []
captured_responses = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )

    page = context.new_page()

    # Capture all network requests and responses
    def on_request(request):
        url = request.url
        if any(kw in url for kw in ['api', 'graphql', 'higgsfield', 'job', 'preset', 'attribute', 'reference']):
            captured_requests.append({'url': url, 'method': request.method})

    def on_response(response):
        url = response.url
        if any(kw in url for kw in ['api', 'graphql', 'higgsfield.ai']) and not any(
            kw in url for kw in ['.js', '.css', '.png', '.jpg', '.webp', '.svg', 'font', 'analytics']
        ):
            try:
                body = response.body()
                if body and len(body) < 100000:  # Only small responses
                    captured_responses.append({
                        'url': url,
                        'status': response.status,
                        'body': body.decode('utf-8', errors='ignore')[:500]
                    })
            except:
                pass

    page.on('request', on_request)
    page.on('response', on_response)

    page.goto(POST_URL, wait_until='networkidle', timeout=60000)
    time.sleep(5)

    print(f'URL: {page.url}', flush=True)
    print(f'\nCaptured requests ({len(captured_requests)}):')
    for req in captured_requests:
        print(f'  {req["method"]} {req["url"][:120]}')

    print(f'\nCaptured API responses ({len(captured_responses)}):')
    for resp in captured_responses:
        print(f'  [{resp["status"]}] {resp["url"][:100]}')
        # Look for reference-related content
        body = resp['body']
        if any(kw in body.lower() for kw in ['reference', 'attribute', 'resize', 'preset', 'object_image', 'ref_img']):
            print(f'    *** CONTAINS REF KEYWORDS ***')
            print(f'    Body: {body[:300]}')

    # Also check Next.js __NEXT_DATA__ or similar
    page_data = page.evaluate("""
        () => {
            // Check for Next.js server data
            const nextData = window.__NEXT_DATA__;
            if (nextData) return JSON.stringify(nextData).substring(0, 2000);

            // Check for any window global data
            const globals = Object.keys(window).filter(k =>
                k.startsWith('__') && typeof window[k] === 'object' && window[k] !== null
            );
            return globals.join(', ');
        }
    """)
    print(f'\nPage global data: {str(page_data)[:500]}', flush=True)

    # Also dump inline JSON scripts
    scripts_data = page.evaluate("""
        () => {
            const scripts = Array.from(document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]'));
            return scripts.map(s => s.textContent.substring(0, 500));
        }
    """)
    print(f'\nInline JSON scripts: {scripts_data}', flush=True)

    # Look for any cloudfront URLs in the page that aren't the main image
    cloudfront_urls = page.evaluate("""
        () => {
            const html = document.documentElement.innerHTML;
            const matches = [];
            const regex = /https:\/\/d2ol7oe51mr4n9\.cloudfront\.net\/[^"'\\s]+/g;
            let match;
            while ((match = regex.exec(html)) !== null) {
                if (!matches.includes(match[0])) matches.push(match[0]);
            }
            return matches;
        }
    """)
    print(f'\nAll cloudfront URLs in page: {cloudfront_urls}', flush=True)

    browser.close()
    print('\nDone!', flush=True)
