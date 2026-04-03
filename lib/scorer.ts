import type { CrawlResult, TechnicalScore, CriterionScore } from './types';

export function calculateTechnicalScore(crawl: CrawlResult): TechnicalScore {
  const pages = crawl.pages;
  const totalPages = pages.length;
  if (totalPages === 0) {
    return {
      total: 0,
      category: 'red',
      categoryLabel: 'Site à retravailler en profondeur',
      criteria: [],
    };
  }

  const criteria: CriterionScore[] = [];

  // 1. HTTPS (10 pts)
  criteria.push({
    name: 'HTTPS',
    key: 'https',
    score: crawl.isHttps ? 10 : 0,
    maxScore: 10,
    details: crawl.isHttps
      ? 'Votre site utilise HTTPS — vos visiteurs voient le cadenas de sécurité.'
      : "Votre site n'utilise pas HTTPS. Google pénalise les sites non sécurisés et vos visiteurs voient un avertissement.",
  });

  // 2. Sitemap (10 pts)
  let sitemapScore = 0;
  let sitemapDetails = '';
  if (crawl.sitemapFound && crawl.sitemapUrls > 0) {
    sitemapScore = 10;
    sitemapDetails = `Sitemap trouvé avec ${crawl.sitemapUrls} URLs déclarées.`;
  } else if (crawl.sitemapFound) {
    sitemapScore = 5;
    sitemapDetails = 'Sitemap trouvé mais semble vide ou mal formé.';
  } else {
    sitemapScore = 0;
    sitemapDetails =
      "Aucun sitemap trouvé. Sans sitemap, Google met plus de temps à découvrir toutes vos pages.";
  }
  criteria.push({
    name: 'Sitemap',
    key: 'sitemap',
    score: sitemapScore,
    maxScore: 10,
    details: sitemapDetails,
  });

  // 3. Meta titles (15 pts)
  const goodTitles = pages.filter(
    (p) => p.title && p.titleLength >= 30 && p.titleLength <= 65
  ).length;
  const titlePercent = goodTitles / totalPages;
  const titleScore = Math.round(titlePercent * 15);
  criteria.push({
    name: 'Meta titres',
    key: 'meta_title',
    score: titleScore,
    maxScore: 15,
    details:
      titleScore >= 12
        ? `${goodTitles}/${totalPages} pages ont un titre de bonne longueur (30-65 caractères).`
        : `Seulement ${goodTitles}/${totalPages} pages ont un titre bien dimensionné. Un titre trop court ou trop long est tronqué dans Google.`,
  });

  // 4. Meta descriptions (10 pts)
  const goodDescs = pages.filter(
    (p) => p.metaDescription && p.metaDescriptionLength >= 120 && p.metaDescriptionLength <= 165
  ).length;
  const descPercent = goodDescs / totalPages;
  const descScore = Math.round(descPercent * 10);
  criteria.push({
    name: 'Meta descriptions',
    key: 'meta_description',
    score: descScore,
    maxScore: 10,
    details:
      descScore >= 8
        ? `${goodDescs}/${totalPages} pages ont une meta description de bonne longueur.`
        : `${goodDescs}/${totalPages} pages ont une meta description optimale (120-165 car.). Sans description, Google génère un extrait automatique souvent moins convaincant.`,
  });

  // 5. H1 tags (15 pts)
  const goodH1 = pages.filter((p) => p.h1Count === 1).length;
  const h1Percent = goodH1 / totalPages;
  const h1Score = Math.round(h1Percent * 15);
  criteria.push({
    name: 'Balises H1',
    key: 'h1',
    score: h1Score,
    maxScore: 15,
    details:
      h1Score >= 12
        ? `${goodH1}/${totalPages} pages ont exactement un H1 — c'est la bonne pratique.`
        : `Seulement ${goodH1}/${totalPages} pages ont exactement un H1. ${
            pages.filter((p) => p.h1Count === 0).length
          } page(s) n'en ont aucun, ${
            pages.filter((p) => p.h1Count > 1).length
          } en ont plusieurs.`,
  });

  // 6. Hn structure (10 pts)
  const goodHn = pages.filter((p) => !p.hnHasSkippedLevels).length;
  const hnPercent = goodHn / totalPages;
  const hnScore = Math.round(hnPercent * 10);
  criteria.push({
    name: 'Structure Hn',
    key: 'hn',
    score: hnScore,
    maxScore: 10,
    details:
      hnScore >= 8
        ? `${goodHn}/${totalPages} pages ont une hiérarchie de titres cohérente (H1→H2→H3 sans saut).`
        : `${totalPages - goodHn} page(s) ont des sauts dans la hiérarchie des titres (ex: passer de H1 à H3 sans H2).`,
  });

  // 7. Images alt (10 pts)
  const totalImages = pages.reduce((s, p) => s + p.totalImages, 0);
  const totalAlts = pages.reduce((s, p) => s + p.imagesWithAlt, 0);
  const altPercent = totalImages > 0 ? totalAlts / totalImages : 1;
  const altScore = Math.round(altPercent * 10);
  criteria.push({
    name: 'Images avec alt',
    key: 'alt',
    score: altScore,
    maxScore: 10,
    details:
      totalImages === 0
        ? "Aucune image détectée sur votre site."
        : `${totalAlts}/${totalImages} images ont un texte alternatif (${Math.round(altPercent * 100)}%). ${
            altPercent < 0.8
              ? "Les images sans 'alt' sont invisibles pour Google et les lecteurs d'écran."
              : ''
          }`,
  });

  // 8. Internal linking (10 pts)
  const avgLinks =
    pages.reduce((s, p) => s + p.internalLinks.length, 0) / totalPages;
  let linkScore: number;
  if (avgLinks >= 4) linkScore = 10;
  else if (avgLinks >= 2) linkScore = 6;
  else linkScore = 2;
  criteria.push({
    name: 'Maillage interne',
    key: 'maillage_interne',
    score: linkScore,
    maxScore: 10,
    details: `En moyenne ${avgLinks.toFixed(1)} liens internes par page. ${
      linkScore < 6
        ? "Un faible maillage empêche Google d'explorer toutes vos pages efficacement."
        : 'Bon maillage entre vos pages.'
    }`,
  });

  // 9. Orphan pages (5 pts)
  const linkedUrls = new Set(pages.flatMap((p) => p.internalLinks));
  const orphans = pages.filter(
    (p, i) => i > 0 && !linkedUrls.has(p.url)
  );
  let orphanScore: number;
  if (orphans.length === 0) orphanScore = 5;
  else if (orphans.length <= 2) orphanScore = 3;
  else orphanScore = 0;
  criteria.push({
    name: 'Pages orphelines',
    key: 'page_orpheline',
    score: orphanScore,
    maxScore: 5,
    details:
      orphans.length === 0
        ? "Aucune page orpheline détectée — toutes vos pages sont liées entre elles."
        : `${orphans.length} page(s) orpheline(s) détectée(s) : aucun lien interne ne pointe vers elles.`,
  });

  // 10. Canonical (5 pts)
  const withCanonical = pages.filter((p) => p.canonical).length;
  const canonicalPercent = withCanonical / totalPages;
  const canonicalScore = Math.round(canonicalPercent * 5);
  criteria.push({
    name: 'Balise canonical',
    key: 'canonical',
    score: canonicalScore,
    maxScore: 5,
    details:
      canonicalScore >= 4
        ? `${withCanonical}/${totalPages} pages ont une balise canonical.`
        : `Seulement ${withCanonical}/${totalPages} pages ont une balise canonical. Sans elle, Google peut considérer des doublons.`,
  });

  // Total
  const total = criteria.reduce((s, c) => s + c.score, 0);
  let category: TechnicalScore['category'];
  let categoryLabel: string;

  if (total < 40) {
    category = 'red';
    categoryLabel = 'Site à retravailler en profondeur';
  } else if (total < 65) {
    category = 'orange';
    categoryLabel = 'Bases présentes, améliorations importantes à faire';
  } else if (total < 85) {
    category = 'yellow';
    categoryLabel = 'Bon niveau, quelques optimisations à apporter';
  } else {
    category = 'green';
    categoryLabel = 'Excellent travail SEO technique';
  }

  return { total, category, categoryLabel, criteria };
}
