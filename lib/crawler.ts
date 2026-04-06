import * as cheerio from 'cheerio';
import type {
  PageData,
  CrawlResult,
  DetectedTechnology,
} from './types';

const CRAWL_TIMEOUT_PER_PAGE = 30_000;
const MAX_URLS = 20;
const MAX_DEPTH = 4;
const EXCLUDED_EXTENSIONS = /\.(pdf|jpg|jpeg|png|gif|svg|webp|mp4|mp3|zip|doc|docx|xls|xlsx)$/i;
const EXCLUDED_PATHS = /\/(wp-admin|wp-login|feed|admin|login|logout|cart|checkout)\b/i;
const UTM_PARAMS = /[?&](utm_\w+|fbclid|gclid|ref)=[^&]*/g;

// ─── URL helpers ───

function normalizeUrl(raw: string, base: string): string | null {
  try {
    const url = new URL(raw, base);
    // Only HTTP(S)
    if (!url.protocol.startsWith('http')) return null;
    // Remove hash
    url.hash = '';
    // Remove UTM & tracking params
    url.search = url.search.replace(UTM_PARAMS, '');
    if (url.search === '?') url.search = '';
    // Remove trailing slash (except root)
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.href;
  } catch {
    return null;
  }
}

function isSameDomain(url: string, base: string): boolean {
  try {
    const a = new URL(url);
    const b = new URL(base);
    // Match domain ignoring www
    const stripWww = (h: string) => h.replace(/^www\./, '');
    return stripWww(a.hostname) === stripWww(b.hostname);
  } catch {
    return false;
  }
}

function isValidCrawlUrl(url: string): boolean {
  if (EXCLUDED_EXTENSIONS.test(url)) return false;
  if (EXCLUDED_PATHS.test(new URL(url).pathname)) return false;
  return true;
}

// ─── SSRF protection ───

function isPrivateUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') return true;
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) return true;
    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return true;
    return false;
  } catch {
    return true;
  }
}

// ─── Fetch with timeout ───

async function fetchWithTimeout(
  url: string,
  timeoutMs: number = CRAWL_TIMEOUT_PER_PAGE
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'MamieSEO-Analyzer/1.0 (compatible; educational SEO tool)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Sitemap parsing ───

async function findSitemapUrls(baseUrl: string): Promise<{ urls: string[]; found: boolean }> {
  const candidates = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap.php`,
    `${baseUrl}/sitemap.html`,
  ];

  // Try robots.txt first
  try {
    const robotsRes = await fetchWithTimeout(`${baseUrl}/robots.txt`, 10_000);
    if (robotsRes.ok) {
      const text = await robotsRes.text();
      const sitemapMatch = text.match(/Sitemap:\s*(.+)/i);
      if (sitemapMatch) {
        candidates.unshift(sitemapMatch[1].trim());
      }
    }
  } catch {
    // ignore
  }

  for (const candidate of candidates) {
    try {
      const res = await fetchWithTimeout(candidate, 10_000);
      if (!res.ok) continue;
      const text = await res.text();

      // Check for sitemap index
      if (text.includes('<sitemapindex')) {
        const $ = cheerio.load(text, { xml: true });
        const subSitemaps: string[] = [];
        $('sitemap loc').each((_, el) => {
          subSitemaps.push($(el).text().trim());
        });

        const allUrls: string[] = [];
        for (const sub of subSitemaps.slice(0, 5)) {
          try {
            const subRes = await fetchWithTimeout(sub, 10_000);
            if (!subRes.ok) continue;
            const subText = await subRes.text();
            const $sub = cheerio.load(subText, { xml: true });
            $sub('url loc').each((_, el) => {
              allUrls.push($sub(el).text().trim());
            });
          } catch {
            // ignore individual sub-sitemaps
          }
        }
        return { urls: allUrls, found: true };
      }

      // Regular sitemap
      if (text.includes('<urlset')) {
        const $ = cheerio.load(text, { xml: true });
        const urls: string[] = [];
        $('url loc').each((_, el) => {
          urls.push($(el).text().trim());
        });
        return { urls, found: true };
      }
    } catch {
      // continue to next candidate
    }
  }

  return { urls: [], found: false };
}

// ─── Technology detection ───

function detectTechnologies(html: string, url: string): DetectedTechnology[] {
  const techs: DetectedTechnology[] = [];

  // CMS detection
  if (html.includes('content="WordPress') || html.includes('/wp-content/') || html.includes('/wp-includes/')) {
    techs.push({ name: 'WordPress', category: 'cms' });
  }
  if (html.includes('content="Webflow"') || html.includes('data-wf-') || /class="[^"]*w-layout/.test(html)) {
    techs.push({ name: 'Webflow', category: 'cms' });
  }
  if (html.includes('content="Wix.com"') || html.includes('static.wixstatic.com')) {
    techs.push({ name: 'Wix', category: 'cms' });
  }
  if (html.includes('content="Squarespace"') || html.includes('window.Squarespace')) {
    techs.push({ name: 'Squarespace', category: 'cms' });
  }
  if (html.includes('content="Shopify"') || html.includes('cdn.shopify.com')) {
    techs.push({ name: 'Shopify', category: 'cms' });
  }

  // Framework detection
  if (html.includes('__NEXT_DATA__')) {
    techs.push({ name: 'Next.js', category: 'framework' });
  }
  if (html.includes('id="__gatsby"') || html.includes('id="___gatsby"')) {
    techs.push({ name: 'Gatsby', category: 'framework' });
  }
  if (html.includes('data-reactroot') || html.includes('data-react')) {
    techs.push({ name: 'React', category: 'framework' });
  }
  if (html.includes('window.__NUXT__') || html.includes('__nuxt')) {
    techs.push({ name: 'Nuxt.js', category: 'framework' });
  }

  // CSS frameworks
  if (/class="[^"]*(?:flex|grid|text-(?:sm|lg|xl)|bg-|px-|py-)/.test(html)) {
    techs.push({ name: 'Tailwind CSS', category: 'css' });
  }
  if (/class="[^"]*(?:container|col-md|col-lg|row|btn btn-)/.test(html)) {
    techs.push({ name: 'Bootstrap', category: 'css' });
  }

  // Analytics
  if (html.includes('gtag') || html.includes('googletagmanager.com') || html.includes("ga('")) {
    techs.push({ name: 'Google Analytics', category: 'analytics' });
  }
  if (html.includes('_hjSettings') || html.includes('hotjar.com')) {
    techs.push({ name: 'Hotjar', category: 'analytics' });
  }
  if (html.includes('matomo') || html.includes('piwik')) {
    techs.push({ name: 'Matomo', category: 'analytics' });
  }

  return techs;
}

// ─── JS-heavy detection ───

function isJsHeavy(html: string): boolean {
  const $ = cheerio.load(html);
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  // Check for empty React/Vue/Angular root
  if ($('#root').length && bodyText.length < 500) return true;
  if ($('#app').length && bodyText.length < 500) return true;
  if ($('#__next').length && bodyText.length < 200) return true;
  return bodyText.length < 200;
}

// ─── Extract page data ───

function extractPageData(html: string, url: string, responseTimeMs: number): PageData {
  const $ = cheerio.load(html);

  // Title
  const title = $('title').first().text().trim() || null;

  // Meta description
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() || null;

  // Meta robots
  const metaRobots =
    $('meta[name="robots"]').attr('content')?.trim() || null;

  // Canonical
  const canonical =
    $('link[rel="canonical"]').attr('href')?.trim() || null;

  // HTML lang
  const htmlLang = $('html').attr('lang')?.trim() || null;

  // Headings
  const h1Content: string[] = [];
  $('h1').each((_, el) => {
    h1Content.push($(el).text().trim());
  });

  const hnHierarchy: string[] = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    hnHierarchy.push(el.tagName.toUpperCase());
  });

  // Check for skipped heading levels
  let hnHasSkippedLevels = false;
  for (let i = 1; i < hnHierarchy.length; i++) {
    const prev = parseInt(hnHierarchy[i - 1].replace('H', ''));
    const curr = parseInt(hnHierarchy[i].replace('H', ''));
    if (curr > prev + 1) {
      hnHasSkippedLevels = true;
      break;
    }
  }

  // Images
  let totalImages = 0;
  let imagesWithAlt = 0;
  $('img').each((_, el) => {
    totalImages++;
    const alt = $(el).attr('alt');
    if (alt && alt.trim().length > 0) imagesWithAlt++;
  });

  // Internal links
  const internalLinks: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const normalized = normalizeUrl(href, url);
    if (normalized && isSameDomain(normalized, url)) {
      internalLinks.push(normalized);
    }
  });

  // Text content
  $('script, style, noscript, nav, footer, header').remove();
  const textContent = $('body').text().replace(/\s+/g, ' ').trim();

  return {
    url,
    title,
    titleLength: title?.length ?? 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length ?? 0,
    metaRobots,
    canonical,
    htmlLang,
    h1Count: h1Content.length,
    h1Content,
    hnHierarchy,
    hnHasSkippedLevels,
    h2Count: $('h2').length,
    h3Count: $('h3').length,
    totalImages,
    imagesWithAlt,
    internalLinks,
    textContent: textContent.slice(0, 10_000), // cap text for API payload size
    responseTimeMs,
  };
}

// ─── robots.txt ───

async function fetchRobotsTxt(baseUrl: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/robots.txt`, 10_000);
    if (res.ok) return await res.text();
  } catch {
    // ignore
  }
  return null;
}

// ─── BFS Crawl ───

async function bfsCrawl(
  startUrl: string,
  onProgress?: (crawled: number, total: number) => void
): Promise<{ pages: PageData[]; allUrls: Set<string> }> {
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];
  const pages: PageData[] = [];
  const allDiscoveredUrls = new Set<string>();

  visited.add(startUrl);
  allDiscoveredUrls.add(startUrl);

  while (queue.length > 0 && visited.size <= MAX_URLS) {
    const batch = queue.splice(0, 5); // Process 5 at a time

    const results = await Promise.allSettled(
      batch.map(async ({ url, depth }) => {
        const start = Date.now();
        const res = await fetchWithTimeout(url);
        const responseTimeMs = Date.now() - start;

        if (!res.ok) return null;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) return null;

        const html = await res.text();
        const pageData = extractPageData(html, res.url || url, responseTimeMs);
        pages.push(pageData);

        // Extract new links if not at max depth
        if (depth < MAX_DEPTH) {
          for (const link of pageData.internalLinks) {
            if (!visited.has(link) && isValidCrawlUrl(link) && visited.size + queue.length < MAX_URLS) {
              visited.add(link);
              allDiscoveredUrls.add(link);
              queue.push({ url: link, depth: depth + 1 });
            }
          }
        }

        return pageData;
      })
    );

    onProgress?.(pages.length, Math.min(visited.size, MAX_URLS));
  }

  return { pages, allUrls: allDiscoveredUrls };
}

// ─── Main crawl function ───

export async function crawlSite(
  inputUrl: string,
  onProgress?: (step: string, detail?: string, progress?: number) => void
): Promise<CrawlResult> {
  // Validate URL
  let baseUrl: string;
  try {
    const parsed = new URL(inputUrl);
    if (!parsed.protocol.startsWith('http')) throw new Error('Invalid protocol');
    baseUrl = `${parsed.protocol}//${parsed.host}`;
  } catch {
    throw new Error("L'URL fournie n'est pas valide. Vérifiez le format (ex: https://monsite.fr)");
  }

  if (isPrivateUrl(inputUrl)) {
    throw new Error("Les adresses locales ou privées ne sont pas autorisées.");
  }

  const errors: string[] = [];

  // Step 1: Connect and fetch homepage
  onProgress?.('connecting', 'Connexion au site...');
  let homepageHtml: string;
  let homepageResponseTime: number;
  let finalUrl: string;

  try {
    const start = Date.now();
    const res = await fetchWithTimeout(inputUrl, CRAWL_TIMEOUT_PER_PAGE);
    homepageResponseTime = Date.now() - start;
    finalUrl = res.url || inputUrl;

    if (!res.ok) {
      throw new Error(`Le site a répondu avec le code ${res.status}`);
    }

    homepageHtml = await res.text();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error("Le site n'a pas répondu dans les 30 secondes. Vérifiez l'URL ou réessayez.");
    }
    throw err;
  }

  // Step 2: Detect technologies
  onProgress?.('detecting_cms', 'Détection du CMS et technologies...');
  const technologies = detectTechnologies(homepageHtml, finalUrl);
  const jsHeavy = isJsHeavy(homepageHtml);

  if (jsHeavy) {
    errors.push(
      'Site détecté comme application JavaScript (SPA). Le crawl statique peut manquer du contenu. ' +
      'Playwright serait nécessaire pour un crawl complet.'
    );
  }

  // Step 3: Find sitemap
  onProgress?.('sitemap', 'Recherche du sitemap...');
  const sitemap = await findSitemapUrls(baseUrl);

  // Step 4: Fetch robots.txt
  const robotsTxt = await fetchRobotsTxt(baseUrl);

  // Step 5: BFS crawl
  onProgress?.('crawling', 'Crawl des pages en cours...', 0);
  const { pages, allUrls } = await bfsCrawl(finalUrl, (crawled, total) => {
    onProgress?.('crawling', `Crawl des pages en cours... (${crawled}/${total})`, Math.round((crawled / total) * 100));
  });

  // Merge sitemap URLs into known pages
  let totalUrlsFound = allUrls.size;
  if (sitemap.found) {
    for (const sitemapUrl of sitemap.urls) {
      const normalized = normalizeUrl(sitemapUrl, baseUrl);
      if (normalized) allUrls.add(normalized);
    }
    totalUrlsFound = allUrls.size;

    // Crawl sitemap-only URLs that we haven't visited yet
    const sitemapOnly = sitemap.urls
      .map((u) => normalizeUrl(u, baseUrl))
      .filter((u): u is string => u !== null && !pages.some((p) => p.url === u))
      .slice(0, MAX_URLS - pages.length);

    if (sitemapOnly.length > 0) {
      const sitemapResults = await Promise.allSettled(
        sitemapOnly.map(async (url) => {
          try {
            const start = Date.now();
            const res = await fetchWithTimeout(url, CRAWL_TIMEOUT_PER_PAGE);
            const ms = Date.now() - start;
            if (!res.ok) return null;
            const ct = res.headers.get('content-type') || '';
            if (!ct.includes('text/html')) return null;
            const html = await res.text();
            return extractPageData(html, url, ms);
          } catch {
            return null;
          }
        })
      );

      for (const result of sitemapResults) {
        if (result.status === 'fulfilled' && result.value) {
          pages.push(result.value);
        }
      }
    }
  }

  // Ensure homepage data is first
  const homepageIndex = pages.findIndex((p) => p.url === finalUrl);
  if (homepageIndex === -1) {
    // Parse homepage if not already in pages
    pages.unshift(extractPageData(homepageHtml, finalUrl, homepageResponseTime));
  } else if (homepageIndex > 0) {
    const [hp] = pages.splice(homepageIndex, 1);
    pages.unshift(hp);
  }

  // Cap at MAX_URLS
  const cappedPages = pages.slice(0, MAX_URLS);

  onProgress?.('analyzing_meta', 'Analyse des titres et métadonnées...');

  return {
    baseUrl,
    finalUrl,
    pages: cappedPages,
    totalUrlsFound,
    totalUrlsCrawled: cappedPages.length,
    sitemapFound: sitemap.found,
    sitemapUrls: sitemap.urls.length,
    robotsTxt,
    isHttps: finalUrl.startsWith('https://'),
    homepageResponseTimeMs: homepageResponseTime,
    technologies,
    usedPlaywright: false,
    errors,
  };
}
