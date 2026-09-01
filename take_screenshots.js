const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const ARTIFACTS_DIR = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\9b3fbae5-03a2-4a28-a0f6-44d98dcfd671';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function saveScreenshot(page, filename) {
  const localPath = path.join(SCREENSHOTS_DIR, filename);
  const artifactPath = path.join(ARTIFACTS_DIR, filename);
  
  await page.screenshot({ path: localPath, fullPage: true });
  fs.copyFileSync(localPath, artifactPath);
  console.log(`[CAPTURED] ${filename} -> ${fs.statSync(localPath).size} bytes`);
}

async function capture() {
  console.log('Launching browser with:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  // 1. Capture Login Page (Public)
  console.log('\n--- 1. Login Page ---');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await saveScreenshot(page, '01-login-page.png');

  // Authenticate as Admin
  console.log('\n--- Authenticating as Admin ---');
  await page.type('input[name="email"]', '', { delay: 10 });
  await page.type('input[name="password"]', '', { delay: 10 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]')
  ]);
  console.log('Post-login URL:', page.url());

  // 2. Admin Dashboard (Live Intersection Control Room)
  console.log('\n--- 2. Admin Dashboard ---');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
  // Wait for canvas animations & live polling to settle
  await new Promise(r => setTimeout(r, 3500));
  await saveScreenshot(page, '02-admin-dashboard.png');

  // 3. Junction and Lane Configuration Screen (Data Entry)
  console.log('\n--- 3. Junction and Lane Configuration Screen ---');
  await page.goto(`${BASE_URL}/configuration`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await saveScreenshot(page, '03-junction-lane-configuration.png');

  // 4. Live Traffic Monitoring Screen (Output / Analytics)
  console.log('\n--- 4. Live Traffic Monitoring Screen ---');
  await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3500)); // Allow Chart.js charts and live sensor metrics to populate
  await saveScreenshot(page, '04-live-traffic-monitoring-screen.png');

  // 5. Traffic Report and Analytics Screen (Output / Reports)
  console.log('\n--- 5. Traffic Report and Analytics Screen ---');
  await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await saveScreenshot(page, '05-traffic-report-and-analytics-screen.png');

  // 6. Emergency Vehicle Alert / Confirmation Screen (Preemption Dispatch)
  console.log('\n--- 6. Emergency Vehicle Alert / Confirmation Screen ---');
  await page.goto(`${BASE_URL}/preemption`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await saveScreenshot(page, '06-emergency-vehicle-alert-screen.png');

  // 7. Pedestrian Crossing Safety Screen
  console.log('\n--- 7. Pedestrian Crossing Safety Screen ---');
  await page.goto(`${BASE_URL}/pedestrian`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await saveScreenshot(page, '07-pedestrian-crossing-safety-screen.png');

  await browser.close();
  console.log('\n=== ALL SCREENSHOTS COMPLETED SUCCESSFULLY ===');
}

capture().catch(err => {
  console.error('[Capture Error]:', err);
  process.exit(1);
});
