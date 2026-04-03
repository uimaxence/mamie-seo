import Anthropic from '@anthropic-ai/sdk';
import type { DeepPageAnalysis, OnboardingAnswers, CrawlResult } from './types';
import {
  captureScreenshots,
  optimizeForApi,
  segmentScreenshot,
  segmentToAbsoluteY,
  extractPageData,
  type ScreenshotResult,
} from './screenshot';

function isPrivateUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') return true;
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) return true;
    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return true;
    if (hostname === '[::1]' || hostname === '169.254.169.254') return true;
    return false;
  } catch {
    return true;
  }
}

function buildSystemPrompt(width: number, height: number): string {
  return `Tu es un expert senior en UI design, UX design, copywriting et conversion, spécialisé dans les sites de freelances et d'indépendants.

Tu analyses un screenshot de page web ainsi que les données HTML extraites. Tu dois identifier entre 6 et 12 zones clés de la page et produire pour chacune une annotation détaillée.

IMPORTANT SUR LES COORDONNÉES :
Le screenshot a une largeur de ${width}px et une hauteur de ${height}px.
Pour chaque annotation, tu dois fournir les coordonnées du point central de la zone concernée, exprimées en pourcentage de la largeur (x) et de la hauteur (y) totales du screenshot.
Exemple : si le hero commence à y=0 et fait 500px de hauteur sur une image de 5000px, le point central du hero est à y = 5%.

Réponds UNIQUEMENT en JSON valide. Aucun texte en dehors du JSON.`;
}

function buildUserPrompt(
  url: string,
  metier: string,
  pageData: { h1: string; h2List: string[]; ctaList: string[]; font: string; imgCount: number; formCount: number },
  width: number,
  height: number,
  segmentInfo?: string
): string {
  return `Voici le screenshot de la page "${url}" appartenant à un(e) ${metier}.
Largeur : ${width}px | Hauteur totale : ${height}px
${segmentInfo || ''}

Données HTML extraites :
- Titre H1 : "${pageData.h1}"
- Titres H2 : ${JSON.stringify(pageData.h2List)}
- CTAs détectés : ${JSON.stringify(pageData.ctaList)}
- Police principale : ${pageData.font}
- Nombre d'images : ${pageData.imgCount}
- Formulaires présents : ${pageData.formCount}

Analyse cette page et produis un rapport JSON avec EXACTEMENT cette structure :

{
  "score_global": number (0-100),
  "resume_executif": "string — résumé en 2-3 phrases du diagnostic global",
  "scores_par_dimension": {
    "premiere_impression": { "score": number, "label": "Première impression (above the fold)" },
    "hierarchie_visuelle": { "score": number, "label": "Hiérarchie visuelle & lisibilité" },
    "copywriting": { "score": number, "label": "Copywriting & clarté du message" },
    "cta_conversion": { "score": number, "label": "Call-to-action & parcours de conversion" },
    "confiance_credibilite": { "score": number, "label": "Signaux de confiance & crédibilité" },
    "coherence_design": { "score": number, "label": "Cohérence visuelle & branding" },
    "mobile_readability": { "score": number, "label": "Lisibilité & expérience mobile" }
  },
  "annotations": [
    {
      "id": number (1 à 12),
      "zone": "nom de la zone (Hero, Navigation, Section services, CTA, Footer...)",
      "x_percent": number (0-100, position horizontale en % de la largeur),
      "y_percent": number (0-100, position verticale en % de la hauteur),
      "type": "critique|avertissement|positif|info",
      "titre": "titre court de l'observation",
      "observation": "ce que tu observes visuellement et pourquoi c'est un problème ou un point fort",
      "recommandation": "action concrète et actionnable à réaliser",
      "impact": "élevé|moyen|faible",
      "difficulte": "facile|moyen|difficile",
      "glossaire_terme": "terme technique utilisé (ou null)"
    }
  ],
  "analyse_mobile": {
    "score": number,
    "problemes_critiques": ["string"],
    "points_positifs": ["string"]
  },
  "analyse_coherence_visuelle": {
    "score": number,
    "palette_detectee": "description des couleurs détectées",
    "coherence_couleurs": "évaluation",
    "coherence_typographie": "évaluation",
    "problemes_detectes": ["string"]
  },
  "plan_action": [
    {
      "priorite": number,
      "categorie": "Copywriting|Conversion|Design|UX",
      "action": "string",
      "impact": "élevé|moyen|faible",
      "difficulte": "facile|moyen|difficile",
      "temps_estime": "string",
      "annotation_ref": number (id de l'annotation liée)
    }
  ],
  "verdict_final": "string — 2-3 phrases de conclusion encourageantes avec les 3 actions les plus impactantes"
}

Produis entre 6 et 12 annotations. Ordonne le plan_action par priorité décroissante (1 = plus urgent).
Réponds UNIQUEMENT avec le JSON.`;
}

export async function analyzePageDeep(
  pageUrl: string,
  crawlResult: CrawlResult,
  onboarding: OnboardingAnswers
): Promise<{
  analysis: DeepPageAnalysis;
  desktopScreenshot: string;
  mobileScreenshot: string | null;
  desktopWidth: number;
  desktopHeight: number;
}> {
  if (isPrivateUrl(pageUrl)) throw new Error('Les URLs privées ne sont pas autorisées.');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const metier = onboarding.metierAutre || onboarding.metier;

  // Try to capture screenshots (may fail on Vercel/serverless)
  let screenshots: Awaited<ReturnType<typeof captureScreenshots>> | null = null;
  let pageData: Awaited<ReturnType<typeof extractPageData>>;

  try {
    const [s, p] = await Promise.all([
      captureScreenshots(pageUrl),
      extractPageData(pageUrl),
    ]);
    screenshots = s;
    pageData = p;
  } catch {
    // Playwright unavailable — fallback to HTML-only analysis via fetch
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'MamieSEO-Analyzer/1.0' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Page inaccessible (${res.status})`);
    const html = await res.text();
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);
    $('script, style, noscript').remove();
    pageData = {
      text: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 10000),
      h1: $('h1').first().text().trim(),
      h2List: $('h2').map((_, el) => $(el).text().trim()).get(),
      ctaList: $('button, a[class*="btn"], a[class*="cta"], [type="submit"]').map((_, el) => $(el).text().trim()).get().filter((t: string) => t.length > 0 && t.length < 80).slice(0, 10),
      font: 'Non détectée (mode texte)',
      imgCount: $('img').length,
      formCount: $('form').length,
      videoCount: $('video, iframe[src*="youtube"]').length,
    };
  }

  // Build content blocks for Claude
  const imageBlocks: Anthropic.Messages.ImageBlockParam[] = [];
  let segmentInfo = '';
  let screenshotWidth = 1440;
  let screenshotHeight = 3000;

  if (screenshots) {
    const segments = await segmentScreenshot(screenshots.desktop);
    screenshotWidth = screenshots.desktopWidth;
    screenshotHeight = screenshots.desktopHeight;

    if (segments.length > 1) {
      segmentInfo = `\nLe screenshot a été découpé en ${segments.length} segments avec 100px de chevauchement :`;
      for (const seg of segments) {
        segmentInfo += `\nImage ${seg.index + 1} : pixels ${seg.offsetY} à ${seg.offsetY + seg.height}`;
        imageBlocks.push({
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: seg.buffer.toString('base64') },
        });
      }
      segmentInfo += '\nLes coordonnées y_percent doivent être relatives à la HAUTEUR TOTALE de la page, pas au segment.';
    } else {
      const optimized = await optimizeForApi(screenshots.desktop);
      imageBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: optimized.toString('base64') },
      });
    }
  } else {
    segmentInfo = '\nATTENTION : Pas de screenshot disponible. Analyse basée uniquement sur le HTML extrait. Positionne quand même les annotations avec des y_percent estimés selon la structure typique (hero ~5%, nav ~2%, services ~35%, testimonials ~65%, footer ~95%).';
  }

  const systemPrompt = buildSystemPrompt(screenshotWidth, screenshotHeight);
  const userPrompt = buildUserPrompt(
    pageUrl, metier, pageData,
    screenshotWidth, screenshotHeight,
    segmentInfo
  );

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        ...imageBlocks,
        { type: 'text', text: userPrompt },
      ],
    }],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error("Claude n'a pas retourné de réponse.");
  }

  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  const analysis = JSON.parse(jsonStr) as DeepPageAnalysis;

  // Clamp annotation coordinates
  for (const ann of analysis.annotations) {
    ann.x_percent = Math.max(5, Math.min(95, ann.x_percent));
    ann.y_percent = Math.max(2, Math.min(98, ann.y_percent));
  }

  // Prepare base64 screenshots for frontend (may be null on serverless)
  let desktopBase64 = '';
  let mobileBase64: string | null = null;
  let finalWidth = screenshotWidth;
  let finalHeight = screenshotHeight;

  if (screenshots) {
    try {
      const desktopOptimized = await optimizeForApi(screenshots.desktop);
      desktopBase64 = desktopOptimized.toString('base64');
      finalWidth = screenshots.desktopWidth;
      finalHeight = screenshots.desktopHeight;
    } catch { /* */ }
    try {
      const mobileOptimized = await optimizeForApi(screenshots.mobile);
      mobileBase64 = mobileOptimized.toString('base64');
    } catch { /* */ }
  }

  return {
    analysis,
    desktopScreenshot: desktopBase64,
    mobileScreenshot: mobileBase64,
    desktopWidth: finalWidth,
    desktopHeight: finalHeight,
  };
}
