import os
import uuid
import asyncio
from pathlib import Path
from urllib.parse import urlparse
from typing import Dict, Any, Optional

try:
    from playwright.async_api import async_playwright, Playwright, Browser, Page
except ImportError:
    async_playwright = None


class BrowserService:
    """
    Singleton service managing a persistent local Playwright Chromium browser session on Windows.
    """
    _instance: Optional['BrowserService'] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BrowserService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._playwright: Optional[Any] = None
        self._browser: Optional[Any] = None
        self._page: Optional[Any] = None
        self._current_url: str = "about:blank"
        self._last_action: str = "Idle"
        self._screenshots_dir = self._get_screenshots_dir()
        self._lock = asyncio.Lock()

    def _get_screenshots_dir(self) -> Path:
        current_dir = Path(__file__).resolve().parent
        project_root = current_dir.parent.parent.parent
        screenshots_dir = project_root / "data" / "screenshots"
        screenshots_dir.mkdir(parents=True, exist_ok=True)
        return screenshots_dir

    @staticmethod
    def validate_url(url: str) -> str:
        """
        Validate URL scheme to ensure safety. Block dangerous file://, javascript:, data: schemes.
        """
        clean_url = url.strip()
        if not clean_url.startswith(("http://", "https://")):
            if clean_url.startswith(("file://", "javascript:", "data:", "about:", "chrome:")):
                raise ValueError(f"Dangerous or restricted URL scheme in '{clean_url}'. Only http:// and https:// are permitted.")
            clean_url = "https://" + clean_url
        
        parsed = urlparse(clean_url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError(f"Invalid URL format '{clean_url}'. Only HTTP/HTTPS protocols are allowed.")
        return clean_url

    async def ensure_browser(self):
        """Ensure Playwright Chromium browser is started."""
        async with self._lock:
            if self._page is not None and not self._page.is_closed():
                return

            if async_playwright is None:
                raise RuntimeError("Playwright package is not installed. Run 'pip install playwright' and 'python -m playwright install chromium'.")

            self._playwright = await async_playwright().start()
            # Launch local Chromium browser window on Windows (headless=False for hackathon visibility or headless=True)
            self._browser = await self._playwright.chromium.launch(headless=True)
            context = await self._browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
            )
            self._page = await context.new_page()
            self._current_url = "https://www.google.com"
            self._last_action = "Browser Initialized"

    async def stop(self):
        """Cleanly close browser and Playwright context."""
        async with self._lock:
            try:
                if self._page:
                    await self._page.close()
                if self._browser:
                    await self._browser.close()
                if self._playwright:
                    await self._playwright.stop()
            except Exception as e:
                print(f"Error closing browser session: {e}")
            finally:
                self._page = None
                self._browser = None
                self._playwright = None
                self._current_url = "about:blank"
                self._last_action = "Stopped"

    async def navigate(self, url: str) -> Dict[str, Any]:
        """Navigate to a specified URL safely."""
        valid_url = self.validate_url(url)
        await self.ensure_browser()
        self._last_action = f"Navigating to {valid_url}"
        
        try:
            response = await self._page.goto(valid_url, wait_until="domcontentloaded", timeout=30000)
            self._current_url = self._page.url
            title = await self._page.title()
            text_content = await self.get_page_text()
            preview = text_content[:500] if text_content else "No text extracted."
            
            return {
                "title": title or "Untitled Page",
                "url": self._current_url,
                "status": response.status if response else 200,
                "preview": preview
            }
        except Exception as e:
            raise RuntimeError(f"Navigation failed for URL '{valid_url}': {str(e)}")

    async def search_google(self, query: str) -> Dict[str, Any]:
        """Perform a Google search query and return extracted readable search results."""
        clean_query = query.strip()
        if not clean_query:
            raise ValueError("Search query cannot be empty.")
        
        await self.ensure_browser()
        self._last_action = f"Searching Google for '{clean_query}'"

        try:
            # Navigate to Google
            await self._page.goto("https://www.google.com", wait_until="domcontentloaded", timeout=20000)
            
            # Type search query into Google search input
            search_input = self._page.locator("textarea[name='q'], input[name='q']").first
            await search_input.fill(clean_query)
            await search_input.press("Enter")
            
            # Wait for search results
            await self._page.wait_for_selector("div#search, div#rso", timeout=15000)
            self._current_url = self._page.url
            
            page_text = await self.get_page_text()
            # Truncate text to 12,000 characters for LLM context budget
            truncated_text = page_text[:12000] if page_text else "No search results text found."
            
            return {
                "query": clean_query,
                "url": self._current_url,
                "results_summary": truncated_text
            }
        except Exception as e:
            # Fallback direct search URL if Google form fill times out
            fallback_url = f"https://www.google.com/search?q={clean_query.replace(' ', '+')}"
            return await self.navigate(fallback_url)

    async def get_page_text(self) -> str:
        """Extract readable body inner text from current webpage."""
        await self.ensure_browser()
        try:
            text = await self._page.evaluate("""() => {
                const scripts = document.querySelectorAll('script, style, noscript, svg, nav, footer');
                scripts.forEach(s => s.remove());
                return document.body ? document.body.innerText : '';
            }""")
            # Clean up excessive whitespace
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            cleaned = "\n".join(lines)
            return cleaned[:15000]
        except Exception:
            return ""

    async def screenshot(self) -> Dict[str, Any]:
        """Capture a screenshot of the current page and save under data/screenshots/."""
        await self.ensure_browser()
        file_name = f"screenshot_{uuid.uuid4().hex[:8]}.png"
        file_path = self._screenshots_dir / file_name
        
        await self._page.screenshot(path=str(file_path), full_page=False)
        self._last_action = f"Captured screenshot {file_name}"
        
        return {
            "file_name": file_name,
            "file_path": str(file_path),
            "url": self._current_url
        }

    async def get_current_url(self) -> str:
        """Return active page URL."""
        if self._page and not self._page.is_closed():
            self._current_url = self._page.url
        return self._current_url

    def get_status(self) -> Dict[str, Any]:
        """Return status dictionary for GET /api/browser/status endpoint."""
        is_running = self._page is not None and not self._page.is_closed()
        return {
            "running": is_running,
            "current_url": self._current_url,
            "last_action": self._last_action
        }
