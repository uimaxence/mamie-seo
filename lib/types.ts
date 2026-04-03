// ─── Onboarding ───

export type Metier =
  | 'developpeur'
  | 'designer'
  | 'consultant'
  | 'coach'
  | 'therapeute'
  | 'formateur'
  | 'artisan'
  | 'autre';

export type ObjectifSite =
  | 'leads'
  | 'portfolio'
  | 'formations'
  | 'rassurer'
  | 'local';

export type AudienceCible =
  | 'particuliers'
  | 'petites_entreprises'
  | 'grandes_entreprises'
  | 'niche';

export type NiveauSEO =
  | 'jamais'
  | 'autodidacte'
  | 'avec_pro'
  | 'sans_resultats';

export type AncienneteSite =
  | 'moins_6_mois'
  | '6_mois_2_ans'
  | 'plus_2_ans';

export interface OnboardingAnswers {
  metier: Metier;
  metierAutre?: string;
  objectif: ObjectifSite;
  audience: AudienceCible;
  audienceNiche?: string;
  niveauSEO: NiveauSEO;
  anciennete: AncienneteSite;
}

// ─── Crawl Data ───

export interface PageData {
  url: string;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  metaRobots: string | null;
  canonical: string | null;
  htmlLang: string | null;
  h1Count: number;
  h1Content: string[];
  hnHierarchy: string[]; // e.g. ['H1', 'H2', 'H3', 'H2']
  hnHasSkippedLevels: boolean;
  h2Count: number;
  h3Count: number;
  totalImages: number;
  imagesWithAlt: number;
  internalLinks: string[];
  textContent: string; // raw visible text
  responseTimeMs: number;
}

export interface DetectedTechnology {
  name: string;
  category: 'cms' | 'framework' | 'css' | 'analytics' | 'other';
}

export interface CrawlResult {
  baseUrl: string;
  finalUrl: string;
  pages: PageData[];
  totalUrlsFound: number;
  totalUrlsCrawled: number;
  sitemapFound: boolean;
  sitemapUrls: number;
  robotsTxt: string | null;
  isHttps: boolean;
  homepageResponseTimeMs: number;
  technologies: DetectedTechnology[];
  usedPlaywright: boolean;
  errors: string[];
}

// ─── Scoring ───

export interface CriterionScore {
  name: string;
  key: string;
  score: number;
  maxScore: number;
  details: string;
}

export interface TechnicalScore {
  total: number;
  category: 'red' | 'orange' | 'yellow' | 'green';
  categoryLabel: string;
  criteria: CriterionScore[];
}

// ─── Claude Editorial Analysis ───

export interface EditorialDimension {
  score: number;
  resume: string;
  point_fort: string;
  point_amelioration: string;
  exemple_concret?: string;
}

export interface MotsClesAnalysis {
  score: number;
  mots_detectes: string[];
  mots_manquants_suggeres: string[];
  explication: string;
  exemple_concret: string;
}

export interface ActionItem {
  priorite: number;
  titre: string;
  impact: string;
  difficulte: string;
  temps_estime: string;
}

export interface EditorialAnalysis {
  score_editorial: number;
  comprehension_activite: EditorialDimension;
  coherence_offres: EditorialDimension;
  signaux_confiance: EditorialDimension;
  call_to_action: EditorialDimension;
  coherence_tonale: EditorialDimension;
  mots_cles_metier: MotsClesAnalysis;
  plan_action_prioritaire: ActionItem[];
  page_recommandee?: {
    url: string;
    raison: string;
  };
}

// ─── Deep Page Analysis ───

export interface DimensionScore {
  score: number;
  label: string;
}

export interface PageAnnotation {
  id: number;
  zone: string;
  x_percent: number;
  y_percent: number;
  type: 'critique' | 'avertissement' | 'positif' | 'info';
  titre: string;
  observation: string;
  recommandation: string;
  impact: string;
  difficulte: string;
  glossaire_terme?: string | null;
}

export interface MobileAnalysis {
  score: number;
  problemes_critiques: string[];
  points_positifs: string[];
}

export interface CoherenceVisuelle {
  score: number;
  palette_detectee: string;
  coherence_couleurs: string;
  coherence_typographie: string;
  problemes_detectes: string[];
}

export interface DeepActionItem {
  priorite: number;
  categorie: string;
  action: string;
  impact: string;
  difficulte: string;
  temps_estime: string;
  annotation_ref?: number;
}

export interface DeepPageAnalysis {
  score_global: number;
  resume_executif: string;
  scores_par_dimension: {
    premiere_impression: DimensionScore;
    hierarchie_visuelle: DimensionScore;
    copywriting: DimensionScore;
    cta_conversion: DimensionScore;
    confiance_credibilite: DimensionScore;
    coherence_design: DimensionScore;
    mobile_readability: DimensionScore;
  };
  annotations: PageAnnotation[];
  analyse_mobile: MobileAnalysis;
  analyse_coherence_visuelle: CoherenceVisuelle;
  plan_action: DeepActionItem[];
  verdict_final: string;
}

// Screenshots data passed alongside analysis
export interface DeepAnalysisResult {
  analysis: DeepPageAnalysis;
  desktopScreenshot: string; // base64
  mobileScreenshot: string | null; // base64
  desktopWidth: number;
  desktopHeight: number;
  remainingCredits: number;
}

// ─── Full Report ───

export interface Report {
  id: string;
  url: string;
  createdAt: string;
  crawlResult: CrawlResult;
  technicalScore: TechnicalScore;
  editorialAnalysis: EditorialAnalysis | null;
  onboarding: OnboardingAnswers;
}

// ─── SSE Progress ───

export type CrawlStep =
  | 'connecting'
  | 'detecting_cms'
  | 'sitemap'
  | 'crawling'
  | 'analyzing_meta'
  | 'scoring'
  | 'editorial'
  | 'generating'
  | 'done'
  | 'error';

export interface ProgressEvent {
  step: CrawlStep;
  message: string;
  detail?: string;
  progress?: number; // 0-100
}
