import { chromium, type Browser } from 'playwright-core';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance?.isConnected()) return browserInstance;

  // Try common Chromium paths
  const executablePaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    process.env.CHROMIUM_PATH,
  ].filter(Boolean) as string[];

  for (const path of executablePaths) {
    try {
      browserInstance = await chromium.launch({
        executablePath: path,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      });
      return browserInstance;
    } catch {
      continue;
    }
  }

  // Fallback: try default launch (works if playwright browsers are installed)
  browserInstance = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  return browserInstance;
}

export async function takeScreenshot(
  url: string,
  options: { width?: number; fullPage?: boolean } = {}
): Promise<Buffer> {
  const { width = 1280, fullPage = true } = options;

  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: { width, height: 800 },
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    // Wait a bit for late-loading content
    await page.waitForTimeout(1500);

    const buffer = await page.screenshot({
      fullPage,
      type: 'png',
    });

    return Buffer.from(buffer);
  } finally {
    await page.close();
  }
}

export async function takeScreenshotAsBase64(url: string): Promise<string> {
  const buffer = await takeScreenshot(url);
  return buffer.toString('base64');
}
