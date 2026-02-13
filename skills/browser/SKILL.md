---
name: browser
description: "Automate web browsing, take screenshots, extract data, and interact with websites using Playwright"
metadata:
  openclaw:
    emoji: "🌐"
    requires:
      bins: ["npx"]
    install:
      - id: npm
        kind: npm
        package: playwright
        bins: [npx]
        label: "NPM (Node.js required)"
---

# Browser Automation Skill

Control a headless Chrome/Chromium browser to automate web interactions, take screenshots, extract data, and more.

## Prerequisites

This skill requires Playwright to be installed:

```bash
# Install Playwright
npm install -D playwright
# or
bun add -d playwright

# Install browser binaries
npx playwright install chromium
```

## Basic Navigation

### Visit URL
```javascript
// Navigate to a website
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://example.com');
```

### Wait for Page Load
```javascript
// Wait for network to be idle
await page.goto('https://example.com', { waitUntil: 'networkidle' });

// Wait for specific element
await page.waitForSelector('.content');

// Wait for timeout
await page.waitForTimeout(2000); // 2 seconds
```

## Screenshots

### Capture Full Page
```javascript
// Take full page screenshot
await page.screenshot({
  path: 'screenshot.png',
  fullPage: true
});
```

### Capture Specific Element
```javascript
// Screenshot specific element
const element = await page.$('.header');
await element.screenshot({ path: 'header.png' });
```

### Capture Viewport Only
```javascript
// Screenshot visible area
await page.screenshot({
  path: 'viewport.png',
  fullPage: false
});
```

## Element Interaction

### Click Elements
```javascript
// Click by selector
await page.click('button.submit');

// Click by text
await page.click('text=Sign In');

// Double click
await page.dblclick('.item');

// Right click
await page.click('.menu', { button: 'right' });
```

### Type and Fill Forms
```javascript
// Type text (with delays)
await page.type('input[name="username"]', 'myuser');

// Fill instantly
await page.fill('input[name="email"]', 'user@example.com');

// Clear and type
await page.fill('input[name="search"]', '');
await page.type('input[name="search"]', 'query');
```

### Select Dropdowns
```javascript
// Select by value
await page.selectOption('select#country', 'USA');

// Select by label
await page.selectOption('select#country', { label: 'United States' });

// Select multiple
await page.selectOption('select#tags', ['tag1', 'tag2']);
```

### Check and Uncheck
```javascript
// Check checkbox
await page.check('input[type="checkbox"]#terms');

// Uncheck
await page.uncheck('input[type="checkbox"]#newsletter');

// Toggle
const isChecked = await page.isChecked('#terms');
if (!isChecked) await page.check('#terms');
```

## Data Extraction

### Get Text Content
```javascript
// Get element text
const title = await page.textContent('h1');

// Get inner HTML
const html = await page.innerHTML('.content');

// Get attribute
const href = await page.getAttribute('a.link', 'href');
```

### Extract Multiple Elements
```javascript
// Get all matching elements
const links = await page.$$eval('a', anchors =>
  anchors.map(a => ({
    text: a.textContent,
    href: a.href
  }))
);

// Get table data
const tableData = await page.$$eval('table tr', rows =>
  rows.map(row =>
    Array.from(row.querySelectorAll('td')).map(cell => cell.textContent)
  )
);
```

### Evaluate JavaScript
```javascript
// Run custom JavaScript
const pageTitle = await page.evaluate(() => document.title);

// Pass arguments
const result = await page.evaluate(
  (x, y) => x + y,
  5, 10
); // Returns 15

// Extract data with complex logic
const data = await page.evaluate(() => {
  return {
    url: window.location.href,
    cookies: document.cookie,
    localStorage: Object.keys(localStorage)
  };
});
```

## Forms and Authentication

### Login Flow
```javascript
// Navigate to login page
await page.goto('https://example.com/login');

// Fill credentials
await page.fill('input[name="username"]', 'myuser');
await page.fill('input[name="password"]', 'mypass');

// Submit form
await page.click('button[type="submit"]');

// Wait for navigation
await page.waitForNavigation();

// Verify logged in
const username = await page.textContent('.user-name');
```

### Handle Multi-Step Forms
```javascript
// Step 1
await page.fill('#email', 'user@example.com');
await page.click('button:has-text("Next")');
await page.waitForSelector('#password');

// Step 2
await page.fill('#password', 'secret');
await page.click('button:has-text("Sign In")');
```

## Advanced Features

### Handle Popups and Dialogs
```javascript
// Handle alert/confirm/prompt
page.on('dialog', async dialog => {
  console.log(dialog.message());
  await dialog.accept(); // or dialog.dismiss()
});

// Handle new windows/tabs
const [newPage] = await Promise.all([
  page.waitForEvent('popup'),
  page.click('a[target="_blank"]')
]);
await newPage.waitForLoadState();
```

### Wait Strategies
```javascript
// Wait for element to be visible
await page.waitForSelector('.result', { state: 'visible' });

// Wait for element to be hidden
await page.waitForSelector('.loader', { state: 'hidden' });

// Wait for custom condition
await page.waitForFunction(() =>
  document.querySelectorAll('.item').length > 10
);

// Wait for network request
await page.waitForResponse(
  response => response.url().includes('/api/data')
);
```

### Scroll and Viewport
```javascript
// Scroll to element
await page.locator('.footer').scrollIntoViewIfNeeded();

// Scroll page
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

// Set viewport size
await page.setViewportSize({ width: 1920, height: 1080 });
```

### File Downloads
```javascript
// Handle download
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.click('a.download-link')
]);

// Save download
const path = await download.path();
await download.saveAs('./downloaded-file.pdf');
```

### File Uploads
```javascript
// Upload single file
await page.setInputFiles('input[type="file"]', 'path/to/file.pdf');

// Upload multiple files
await page.setInputFiles('input[type="file"]', [
  'file1.jpg',
  'file2.jpg'
]);

// Remove files
await page.setInputFiles('input[type="file"]', []);
```

## Browser Context and Cookies

### Manage Cookies
```javascript
// Set cookies
await page.context().addCookies([{
  name: 'session',
  value: 'abc123',
  domain: 'example.com',
  path: '/'
}]);

// Get cookies
const cookies = await page.context().cookies();

// Clear cookies
await page.context().clearCookies();
```

### Local Storage
```javascript
// Set local storage
await page.evaluate(() => {
  localStorage.setItem('key', 'value');
});

// Get local storage
const storage = await page.evaluate(() =>
  Object.entries(localStorage)
);
```

### Persistent Context
```javascript
// Browser with persistent session
const context = await chromium.launchPersistentContext('./user-data', {
  headless: false
});
const page = await context.newPage();
// Cookies and storage persist across sessions
```

## Practical Examples

### Scrape Product Prices
```javascript
const products = await page.$$eval('.product', items =>
  items.map(item => ({
    name: item.querySelector('.title').textContent,
    price: item.querySelector('.price').textContent,
    link: item.querySelector('a').href
  }))
);
```

### Monitor Website Changes
```javascript
// Take baseline screenshot
await page.goto('https://example.com/prices');
await page.screenshot({ path: 'baseline.png' });

// Check later
await page.goto('https://example.com/prices');
await page.screenshot({ path: 'current.png' });
// Compare images to detect changes
```

### Fill Out Complex Form
```javascript
await page.goto('https://example.com/survey');

// Multiple choice
await page.click('input[value="option1"]');

// Text inputs
await page.fill('#name', 'John Doe');
await page.fill('#email', 'john@example.com');

// Dropdown
await page.selectOption('#country', 'USA');

// Checkboxes
await page.check('#terms');
await page.check('#newsletter');

// Submit
await page.click('button[type="submit"]');
await page.waitForSelector('.success-message');
```

### Extract Search Results
```javascript
await page.goto('https://search-engine.com');
await page.fill('input[name="q"]', 'playwright automation');
await page.press('input[name="q"]', 'Enter');
await page.waitForSelector('.search-result');

const results = await page.$$eval('.search-result', items =>
  items.slice(0, 10).map(item => ({
    title: item.querySelector('h3').textContent,
    url: item.querySelector('a').href,
    snippet: item.querySelector('.snippet').textContent
  }))
);
```

## Error Handling

```javascript
try {
  await page.goto('https://example.com', { timeout: 10000 });
  await page.click('.button', { timeout: 5000 });
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.log('Operation timed out');
  }
  // Take screenshot for debugging
  await page.screenshot({ path: 'error.png' });
} finally {
  await browser.close();
}
```

## Performance Tips

- Use `page.waitForLoadState('networkidle')` sparingly (slow)
- Prefer specific selectors over waiting for timeouts
- Reuse browser instances when possible
- Use headless mode for better performance
- Set viewport to reduce rendering time

## Complete Example

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate
    await page.goto('https://github.com/search');

    // Search
    await page.fill('input[name="q"]', 'playwright automation');
    await page.press('input[name="q"]', 'Enter');
    await page.waitForSelector('.repo-list-item');

    // Extract data
    const repos = await page.$$eval('.repo-list-item', items =>
      items.slice(0, 5).map(item => ({
        name: item.querySelector('h3 a').textContent.trim(),
        stars: item.querySelector('.octicon-star').parentElement.textContent.trim(),
        url: 'https://github.com' + item.querySelector('h3 a').getAttribute('href')
      }))
    );

    // Screenshot
    await page.screenshot({ path: 'github-search.png', fullPage: true });

    console.log(repos);
  } finally {
    await browser.close();
  }
})();
```

## Integration with Siempre

When using from Telegram, Siempre can:
- Take screenshots and send them back
- Extract data and format as text/JSON
- Automate form filling
- Monitor websites for changes
- Perform authenticated actions

Example Telegram command:
> "Go to news.ycombinator.com and screenshot the top 5 posts"

Siempre will execute the browser automation and send you the screenshot!
