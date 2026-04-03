import { chromium, type Browser, type Page } from 'playwright-core';
import sharp from 'sharp';

let browserInstance: Browser | null = null;

const COOKIE_SELECTORS = [
  '[class*="cookie"]', '[id*="cookie"]', '[class*="gdpr"]',
  '[class*="consent"]', '.cc-window', '[class*="banner"]',
  '#onetrust-consent-sdk', '.cky-consent-container',
].join(', ');

async function getBrowser(): Promise<Browser> {
  if (browserInstance?.isConnected()) return browserInstance;

  const paths = [
    process.env.CHROMIUM_PATH,
    '/usr/bin/chromium-browser', '/usr/bin/chromium',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
  ].filter(Boolean) as string[];

  for (const path of paths) {
    try {
      browserInstance = await chromium.launch({
        executablePath: path,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      });
      return browserInstance;
    } catch { continue; }
  }

  browserInstance = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  return browserInstance;
}

async function hideCookieBanners(page: Page) {
  await page.addStyleTag({
    content: `${COOKIE_SELECTORS} { display: none !important; visibility: hidden !important; opacity: 0 !important; }`,
  }).catch(() => {});
}

export interface ScreenshotResult {
  desktop: Buffer;
  mobile: Buffer;
  desktopWidth: number;
  desktopHeight: number;
  mobileWidth: number;
  mobileHeight: number;
}

export interface ScreenshotSegment {
  buffer: Buffer;
  offsetY: number;
  height: number;
  index: number;
}

export async function captureScreenshots(url: string): Promise<ScreenshotResult> {
  const browser = await getBrowser();

  // Desktop capture
  const desktopPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  try {
    await desktopPage.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await hideCookieBanners(desktopPage);
    await desktopPage.emulateMedia({ colorScheme: 'light' });
    await desktopPage.waitForTimeout(1500);

    const desktopBuf = await desktopPage.screenshot({ fullPage: true, type: 'png' });

    // Get dimensions
    const desktopMeta = await sharp(Buffer.from(desktopBuf)).metadata();
    const desktopWidth = desktopMeta.width || 1440;
    const desktopHeight = desktopMeta.height || 900;

    // Mobile capture
    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });

    await mobilePage.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await hideCookieBanners(mobilePage);
    await mobilePage.emulateMedia({ colorScheme: 'light' });
    await mobilePage.waitForTimeout(1500);

    const mobileBuf = await mobilePage.screenshot({ fullPage: true, type: 'png' });
    const mobileMeta = await sharp(Buffer.from(mobileBuf)).metadata();

    await mobilePage.close();
    await desktopPage.close();

    return {
      desktop: Buffer.from(desktopBuf),
      mobile: Buffer.from(mobileBuf),
      desktopWidth,
      desktopHeight,
      mobileWidth: mobileMeta.width || 390,
      mobileHeight: mobileMeta.height || 844,
    };
  } catch (err) {
    await desktopPage.close().catch(() => {});
    throw err;
  }
}

// Optimize screenshot for Claude API (max 1440w, max 6000h)
export async function optimizeForApi(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const w = meta.width || 1440;
  const h = meta.height || 900;

  let result = sharp(buffer);

  if (w > 1440) {
    result = result.resize({ width: 1440 });
  }

  if (h > 6000) {
    result = result.resize({ width: Math.min(w, 1440), height: 6000, fit: 'cover', position: 'top' });
  }

  return result.png({ quality: 85 }).toBuffer();
}

// Split tall screenshots into segments for Claude Vision
const SEGMENT_HEIGHT = 2000;
const OVERLAP = 100;

export async function segmentScreenshot(buffer: Buffer): Promise<ScreenshotSegment[]> {
  const meta = await sharp(buffer).metadata();
  const totalHeight = meta.height || 0;
  const width = meta.width || 1440;

  if (totalHeight <= 6000) {
    // No segmentation needed
    return [{
      buffer: await optimizeForApi(buffer),
      offsetY: 0,
      height: totalHeight,
      index: 0,
    }];
  }

  const segments: ScreenshotSegment[] = [];
  let offset = 0;
  let index = 0;

  while (offset < totalHeight) {
    const segHeight = Math.min(SEGMENT_HEIGHT, totalHeight - offset);

    const segBuf = await sharp(buffer)
      .extract({ left: 0, top: offset, width, height: segHeight })
      .png()
      .toBuffer();

    segments.push({
      buffer: segBuf,
      offsetY: offset,
      height: segHeight,
      index,
    });

    offset += SEGMENT_HEIGHT - OVERLAP;
    index++;

    if (index >= 4) break; // Max 4 segments
  }

  return segments;
}

// Convert segment-relative y_percent to absolute y_percent
export function segmentToAbsoluteY(
  yPercent: number,
  segmentIndex: number,
  segmentHeight: number,
  totalHeight: number
): number {
  const segmentOffset = segmentIndex * (SEGMENT_HEIGHT - OVERLAP);
  const absoluteY = segmentOffset + (yPercent / 100) * segmentHeight;
  return Math.max(2, Math.min(98, (absoluteY / totalHeight) * 100));
}

// Extract page data via Playwright
export async function extractPageData(url: string): Promise<{
  text: string;
  h1: string;
  h2List: string[];
  ctaList: string[];
  font: string;
  imgCount: number;
  formCount: number;
  videoCount: number;
}> {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(1000);

    const data = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.textContent?.trim() || '';
      const h2List = Array.from(document.querySelectorAll('h2')).map(el => el.textContent?.trim() || '').filter(Boolean);
      const ctaList = Array.from(document.querySelectorAll('button, a[class*="btn"], a[class*="cta"], a[class*="button"], [type="submit"]'))
        .map(el => el.textContent?.trim() || '')
        .filter(t => t.length > 0 && t.length < 80)
        .slice(0, 10);
      const font = window.getComputedStyle(document.body).fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      const imgCount = document.querySelectorAll('img').length;
      const formCount = document.querySelectorAll('form').length;
      const videoCount = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;

      // Remove scripts/styles for text extraction
      document.querySelectorAll('script, style, noscript, nav, footer').forEach(el => el.remove());
      const text = document.body?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 10000) || '';

      return { text, h1, h2List, ctaList, font, imgCount, formCount, videoCount };
    });

    await page.close();
    return data;
  } catch (err) {
    await page.close().catch(() => {});
    throw err;
  }
}

export async function takeScreenshotAsBase64(url: string): Promise<string> {
  const result = await captureScreenshots(url);
  const optimized = await optimizeForApi(result.desktop);
  return optimized.toString('base64');
}
