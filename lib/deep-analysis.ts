import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import type { DeepPageAnalysis, OnboardingAnswers, CrawlResult } from './types';

function isPrivateUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') return true;
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) return true;
    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return true;
    if (hostname === '[::1]') return true;
    // Block cloud metadata endpoints
    if (hostname === '169.254.169.254') return true;
    return false;
  } catch {
    return true;
  }
}

async function fetchPageContent(url: string): Promise<{ html: string; text: string }> {
  if (isPrivateUrl(url)) throw new Error('Les URLs privées ne sont pas autorisées.');

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'MamieSEO-Analyzer/1.0 (compatible; educational SEO tool)',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Page inaccessible (${res.status})`);
  const html = await res.text();
  const $ = cheerio.load(html);

  // Extract structured content
  $('script, style, noscript').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();

  return { html, text: text.slice(0, 12_000) };
}

export async function analyzePageDeep(
  pageUrl: string,
  crawlResult: CrawlResult,
  onboarding: OnboardingAnswers
): Promise<DeepPageAnalysis> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const { html, text } = await fetchPageContent(pageUrl);
  const $ = cheerio.load(html);

  // Extract structure info
  const headings: string[] = [];
  $('h1, h2, h3').each((_, el) => {
    headings.push(`${el.tagName}: ${$(el).text().trim()}`);
  });

  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (text && href) links.push(`[${text.slice(0, 50)}](${href.slice(0, 100)})`);
  });

  const images = $('img').length;
  const forms = $('form').length;
  const buttons = $('button, [type="submit"], .btn, [class*="button"]').length;

  const metier = onboarding.metierAutre || onboarding.metier;
  const siteContext = `Site : ${crawlResult.finalUrl}, ${crawlResult.totalUrlsCrawled} pages, CMS : ${crawlResult.technologies.find(t => t.category === 'cms')?.name || 'non détecté'}`;

  const system = `Tu es un expert en UX, copywriting et conversion web spécialisé dans l'accompagnement des freelances et indépendants.
Tu analyses en profondeur UNE page spécifique du site d'un(e) ${metier}.
${siteContext}

Tu dois évaluer cette page du point de vue d'un prospect qui la découvre pour la première fois.
Ton analyse est bienveillante mais précise et actionnable.
Chaque recommandation doit être concrète et réalisable en moins d'une journée.

Format de ta réponse : JSON strict, aucun texte en dehors du JSON.`;

  const user = `Analyse cette page en profondeur : ${pageUrl}

## Contenu textuel de la page
${text}

## Structure
- Titres : ${headings.join(' | ')}
- Liens : ${links.length} liens (${links.slice(0, 10).join(', ')})
- Images : ${images}
- Formulaires : ${forms}
- Boutons/CTA : ${buttons}

## JSON attendu

{
  "score_global": number (0-100),
  "premiere_impression": {
    "score": number (0-100),
    "resume": "Ce que ressent un visiteur dans les 5 premières secondes",
    "points": ["observation 1", "observation 2", "observation 3"],
    "zone_page": "top"
  },
  "structure_page": {
    "score": number (0-100),
    "resume": "Évaluation de la hiérarchie visuelle et du parcours de lecture",
    "points": ["point 1", "point 2", "point 3"],
    "zone_page": "middle"
  },
  "copywriting": {
    "score": number (0-100),
    "resume": "Qualité des textes : clarté, persuasion, ton",
    "points": ["point 1", "point 2", "point 3"],
    "zone_page": "middle"
  },
  "call_to_action": {
    "score": number (0-100),
    "resume": "Efficacité des appels à l'action",
    "points": ["point 1", "point 2", "point 3"],
    "zone_page": "bottom"
  },
  "confiance_preuve_sociale": {
    "score": number (0-100),
    "resume": "Éléments de réassurance et preuve sociale",
    "points": ["point 1", "point 2", "point 3"],
    "zone_page": "bottom"
  },
  "annotations": [
    {
      "label": "nom court de l'élément (ex: Hero, CTA principal, Témoignages)",
      "y_percent": number (0-100, position verticale approximative de l'élément sur la page),
      "verdict": "positif|neutre|negatif",
      "note": "observation courte en 1 phrase"
    }
  ],
  "recommandations": [
    {
      "priorite": 1,
      "titre": "string",
      "description": "description actionnable en 2-3 phrases",
      "impact": "élevé|moyen|faible"
    }
  ]
}

Réponds UNIQUEMENT avec le JSON.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: user }],
    system,
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error("Claude n'a pas retourné de réponse.");
  }

  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  return JSON.parse(jsonStr) as DeepPageAnalysis;
}
