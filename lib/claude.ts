import Anthropic from '@anthropic-ai/sdk';
import type {
  CrawlResult,
  OnboardingAnswers,
  EditorialAnalysis,
  TechnicalScore,
} from './types';

const METIER_LABELS: Record<string, string> = {
  developpeur: 'Développeur',
  designer: 'Designer',
  consultant: 'Consultant',
  coach: 'Coach',
  therapeute: 'Thérapeute',
  formateur: 'Formateur',
  artisan: 'Artisan',
  commercant: 'Commerçant / Gérant de boutique',
  restaurateur: 'Restaurateur',
  professionnel_sante: 'Professionnel de santé',
  autre: 'Professionnel',
};

const OBJECTIF_LABELS: Record<string, string> = {
  leads: 'générer des leads',
  portfolio: 'montrer un portfolio',
  formations: 'vendre des formations',
  rassurer: 'rassurer des prospects',
  local: 'être trouvé localement',
  vendre: 'vendre des produits ou services en ligne',
};

const AUDIENCE_LABELS: Record<string, string> = {
  particuliers: 'des particuliers',
  petites_entreprises: 'des petites entreprises',
  grandes_entreprises: 'des grandes entreprises',
  niche: 'une niche spécifique',
};

const NIVEAU_LABELS: Record<string, string> = {
  jamais: "n'a jamais travaillé son SEO",
  autodidacte: 'un peu, de façon autodidacte',
  avec_pro: 'a déjà travaillé avec un professionnel SEO',
  sans_resultats: 'a travaillé son SEO mais sans résultats visibles',
};

const ANCIENNETE_LABELS: Record<string, string> = {
  moins_6_mois: 'moins de 6 mois',
  '6_mois_2_ans': 'entre 6 mois et 2 ans',
  plus_2_ans: 'plus de 2 ans',
};

function buildPrompt(
  crawl: CrawlResult,
  onboarding: OnboardingAnswers,
  technicalScore: TechnicalScore
): { system: string; user: string } {
  const metier = onboarding.metier === 'autre' && onboarding.metierAutre
    ? onboarding.metierAutre
    : METIER_LABELS[onboarding.metier] || onboarding.metier;

  const audience = onboarding.audience === 'niche' && onboarding.audienceNiche
    ? onboarding.audienceNiche
    : AUDIENCE_LABELS[onboarding.audience] || onboarding.audience;

  const system = `Tu es un expert SEO et copywriting spécialisé dans l'accompagnement des indépendants, freelances, artisans, commerçants et petites entreprises.
Tu analyses le site web d'un(e) ${metier} dont l'objectif est ${OBJECTIF_LABELS[onboarding.objectif] || onboarding.objectif} et qui cible ${audience}.
Ce professionnel ${NIVEAU_LABELS[onboarding.niveauSEO] || onboarding.niveauSEO} d'expérience en SEO et son site existe depuis ${ANCIENNETE_LABELS[onboarding.anciennete] || onboarding.anciennete}.

Tu dois produire une analyse structurée, bienveillante mais honnête. Tu utilises un langage accessible,
sans jargon inutile. Quand tu utilises un terme technique, tu l'expliques immédiatement entre parenthèses.
Tu illustres chaque recommandation avec un exemple concret adapté au métier de la personne.

Format de ta réponse : JSON strict, aucun texte en dehors du JSON.`;

  // Prepare homepage and key pages content
  const homepage = crawl.pages[0];
  const keyPagePatterns = ['/a-propos', '/about', '/services', '/offres', '/prestations', '/contact', '/tarifs'];
  const keyPages = crawl.pages
    .filter((p) => {
      const path = new URL(p.url).pathname.toLowerCase();
      return keyPagePatterns.some((pat) => path.includes(pat));
    })
    .slice(0, 5);

  // All H1/H2 and meta data
  const allMeta = crawl.pages.map((p) => ({
    url: p.url,
    title: p.title,
    description: p.metaDescription,
    h1: p.h1Content,
    h2Count: p.h2Count,
  }));

  const cms = crawl.technologies.find((t) => t.category === 'cms')?.name || 'Non détecté';

  const user = `Voici les données du site ${crawl.finalUrl} à analyser :

## Contexte technique
- CMS détecté : ${cms}
- HTTPS : ${crawl.isHttps ? 'Oui' : 'Non'}
- Score technique : ${technicalScore.total}/100 (${technicalScore.categoryLabel})
- Pages crawlées : ${crawl.totalUrlsCrawled}
- Sitemap : ${crawl.sitemapFound ? `trouvé (${crawl.sitemapUrls} URLs)` : 'absent'}
- Temps de réponse homepage : ${crawl.homepageResponseTimeMs}ms

## Contenu de la homepage
${homepage?.textContent?.slice(0, 5000) || '(contenu non disponible)'}

## Pages principales détectées
${keyPages.map((p) => `### ${p.url}\n${p.textContent?.slice(0, 2000) || '(vide)'}`).join('\n\n')}

## Métadonnées de toutes les pages
${JSON.stringify(allMeta, null, 2)}

## Structure JSON attendue pour ta réponse

{
  "score_editorial": number (0-100),
  "comprehension_activite": {
    "score": number,
    "resume": "string",
    "point_fort": "string",
    "point_amelioration": "string",
    "exemple_concret": "string"
  },
  "coherence_offres": { same structure },
  "signaux_confiance": { same structure },
  "call_to_action": { same structure },
  "coherence_tonale": {
    "score": number,
    "resume": "string",
    "point_fort": "string",
    "point_amelioration": "string"
  },
  "mots_cles_metier": {
    "score": number,
    "mots_detectes": ["string"],
    "mots_manquants_suggeres": ["string"],
    "explication": "string",
    "exemple_concret": "string"
  },
  "plan_action_prioritaire": [
    {
      "priorite": number,
      "titre": "string",
      "impact": "élevé|moyen|faible",
      "difficulte": "facile|moyen|difficile",
      "temps_estime": "string"
    }
  ],
  "page_recommandee": {
    "url": "l'URL complète de la page la plus stratégique à optimiser en priorité (la page sur laquelle les prospects sont les plus susceptibles d'arriver et qui doit être la mieux travaillée — pas la homepage si une autre page est plus critique)",
    "raison": "en 1-2 phrases, pourquoi cette page est la plus importante à travailler"
  }
}

Réponds UNIQUEMENT avec le JSON, aucun texte avant ou après.`;

  return { system, user };
}

export async function analyzeWithClaude(
  crawl: CrawlResult,
  onboarding: OnboardingAnswers,
  technicalScore: TechnicalScore
): Promise<EditorialAnalysis> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const { system, user } = buildPrompt(crawl, onboarding, technicalScore);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: user }],
    system,
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error("Claude n'a pas retourné de réponse textuelle.");
  }

  // Extract JSON from response (handle potential markdown code blocks)
  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr) as EditorialAnalysis;
    return parsed;
  } catch {
    throw new Error(
      "La réponse de Claude n'est pas un JSON valide. Veuillez réessayer."
    );
  }
}
