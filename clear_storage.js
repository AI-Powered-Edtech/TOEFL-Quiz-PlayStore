const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('localhost:5173')) || pages[0];
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  console.log('Cleared');
  await browser.disconnect();
})();
