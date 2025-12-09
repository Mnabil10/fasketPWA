const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR', err.message));
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  console.log('TITLE', await page.title());
  const hasRoot = await page.$('#root');
  console.log('HAS_ROOT', !!hasRoot);
  await browser.close();
})();
