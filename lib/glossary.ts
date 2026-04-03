export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const glossary: Record<string, GlossaryEntry> = {
  sitemap: {
    term: 'Sitemap',
    definition:
      'Un fichier qui liste toutes les pages de votre site pour aider Google à les trouver plus vite.',
  },
  meta_title: {
    term: 'Meta title',
    definition:
      "Le titre de votre page tel qu'il apparaît dans les résultats Google. C'est le premier texte que voit votre futur client.",
  },
  meta_description: {
    term: 'Meta description',
    definition:
      "La courte description sous le titre dans Google. Elle n'influence pas directement le classement mais elle donne envie (ou non) de cliquer.",
  },
  h1: {
    term: 'Balise H1',
    definition:
      "Le titre principal visible sur votre page. Il doit y en avoir exactement un par page et contenir votre mot-clé principal.",
  },
  maillage_interne: {
    term: 'Maillage interne',
    definition:
      "Le fait de faire des liens entre vos propres pages. Ça aide Google à comprendre votre site et ça garde vos visiteurs plus longtemps.",
  },
  alt: {
    term: 'Balise alt',
    definition:
      "Une courte description d'une image, invisible sur la page mais lue par Google et les personnes malvoyantes.",
  },
  https: {
    term: 'HTTPS',
    definition:
      "Le cadenas visible dans la barre d'adresse. Il signifie que votre site est sécurisé. Google favorise les sites en HTTPS.",
  },
  canonical: {
    term: 'Canonical',
    definition:
      "Une balise qui dit à Google quelle est la \"vraie\" version d'une page si elle existe en plusieurs URL différentes.",
  },
  page_orpheline: {
    term: 'Page orpheline',
    definition:
      "Une page de votre site qu'aucune autre page ne cite avec un lien. Google a du mal à la trouver et la considère peu importante.",
  },
  cms: {
    term: 'CMS',
    definition:
      'Le logiciel qui vous permet de créer et gérer votre site (WordPress, Webflow, Wix, Squarespace…).',
  },
  hn: {
    term: 'Balise Hn',
    definition:
      "La hiérarchie des titres d'une page : H1 (titre principal), H2 (sections), H3 (sous-sections). Comme les chapitres d'un livre.",
  },
  temps_reponse: {
    term: 'Temps de réponse',
    definition:
      "Le temps que met votre site à s'afficher. Google pénalise les sites lents, surtout sur mobile.",
  },
};
