const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Listen for console events and store logs
  const logs = [];
  page.on('console', (consoleMessage) => {
    logs.push({
      type: consoleMessage.type(),
      text: consoleMessage.text(),
    });
  });

  try {
    await page.goto('http://127.0.0.1:5500/index.html', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      window.apiCalls = [];
      window.originalBpConfig = bpConfig;
      bpConfig = function (websiteId, pageId) {
        window.apiCalls.push({ type: 'bpConfig', websiteId, pageId });
        return window.originalBpConfig.apply(this, arguments);
      };
    });

    // Reload the page to trigger the modified bpConfig function
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Retrieve captured API calls
    const apiCalls = await page.evaluate(() => window.apiCalls);

    if (apiCalls === undefined) {
      console.log('No API calls captured.');
    } else {
      // Display captured API calls
      console.log('Captured API Calls:');
      apiCalls.forEach((call, index) => {
        console.log(`Call ${index + 1}:`, call);
      });

      // Check if the expected pageId is present in the captured API calls
      const expectedPageId = 777232; 
      const hasExpectedPageId = apiCalls.some(call => call.pageId === expectedPageId);
      if (hasExpectedPageId) {
        console.log(`Script executed with the expected pageId: ${expectedPageId}`);
      } else {
        console.log(`Script did not execute with the expected pageId: ${expectedPageId}`);
      }
    }

    console.log('All Console Logs:');
    logs.forEach((log, index) => {
      console.log(`Log ${index + 1} [${log.type}]:`, log.text);
    });
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
  }
})();
