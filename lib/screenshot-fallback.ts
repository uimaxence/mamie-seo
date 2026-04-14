// External screenshot service fallback for serverless environments (Vercel)
// Uses thum.io (free, no API key) for screenshots
// and a headless fetch + cheerio for better HTML extraction

import * as cheerio from 'cheerio';

const THUM_BASE = 'https://image.thum.io/get';

// ─── Screenshot via thum.io ───

export async function externalScreenshot(
  url: string,
  options: { width?: number; fullPage?: boolean; mobile?: boolean; crop?: number } = {}
): Promise<Buffer | null> {
  const { width = 1440, mobile = false, crop = 1200 } = options;

  // Build thum.io URL with wait for JS rendering
  const params = [
    `width/${width}`,
    'wait/8',           // Wait 8 seconds for JS to render
    'noanimate',        // Disable CSS animations
    'maxAge/2',
    mobile ? 'viewportWidth/390' : '',
    `crop/${crop}`,
  ].filter(Boolean).join('/');

  const thumbUrl = `${THUM_BASE}/${params}/${url}`;

  try {
    const res = await fetch(thumbUrl, {
      signal: AbortSignal.timeout(45_000), // 45s to allow thum.io 8s wait + rendering
    });

    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

// ─── Better HTML extraction (handles more CTA/image patterns) ───

export async function extractPageDataEnhanced(url: string): Promise<{
  text: string;
  h1: string;
  h2List: string[];
  ctaList: string[];
  font: string;
  imgCount: number;
  formCount: number;
  videoCount: number;
  allLinks: string[];
}> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Page inaccessible (${res.status})`);
  const html = await res.text();
  const $ = cheerio.load(html);

  // H1
  const h1 = $('h1').first().text().trim();

  // H2s
  const h2List = $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean);

  // CTA detection — broad selectors covering common patterns
  const ctaSelectors = [
    'button',
    'a[class*="btn"]', 'a[class*="cta"]', 'a[class*="button"]',
    'a[class*="Btn"]', 'a[class*="CTA"]', 'a[class*="Button"]',
    '[type="submit"]',
    'a[href*="contact"]', 'a[href*="rdv"]', 'a[href*="calendly"]',
    'a[href*="booking"]', 'a[href*="rendez-vous"]', 'a[href*="devis"]',
    // Webflow specific
    'a.w-button',
    // Common role patterns
    '[role="button"]',
    // Links that look like buttons (short text, uppercase, etc.)
  ].join(', ');

  const ctaList = $(ctaSelectors)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t: string) => t.length > 0 && t.length < 80)
    .filter((t: string, i: number, arr: string[]) => arr.indexOf(t) === i) // deduplicate
    .slice(0, 15);

  // Images — count all img, picture source, background images
  const imgFromTags = $('img').length;
  const imgFromPicture = $('picture source').length;
  const imgFromBg = $('[style*="background-image"]').length;
  const imgCount = imgFromTags + Math.floor(imgFromPicture / 2) + imgFromBg;

  // Forms
  const formCount = $('form').length;

  // Videos
  const videoCount = $('video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="wistia"]').length;

  // Font detection from inline styles or link tags
  let font = 'Non détectée';
  const fontLink = $('link[href*="fonts.googleapis.com"]').attr('href');
  if (fontLink) {
    const fontMatch = fontLink.match(/family=([^:&]+)/);
    if (fontMatch) font = decodeURIComponent(fontMatch[1]).replace(/\+/g, ' ');
  }

  // All link texts (for understanding navigation)
  const allLinks = $('a')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t: string) => t.length > 0 && t.length < 60)
    .slice(0, 30);

  // Text content
  $('script, style, noscript').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 12000);

  return { text, h1, h2List, ctaList, font, imgCount, formCount, videoCount, allLinks };
}

// ─── Convert buffer to base64 ───
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}
