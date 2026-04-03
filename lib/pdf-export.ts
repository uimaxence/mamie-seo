import { jsPDF } from 'jspdf';
import type { Report, DeepPageAnalysis } from './types';

// ─── Constants ───
const PRIMARY = '#1A1A18';
const SECONDARY = '#73726C';
const MUTED = '#C2C0B6';
const BORDER = '#EEEDEB';
const WHITE = '#FFFFFF';
const SURFACE = '#F8F8F7';
const GREEN = '#22A168';
const ORANGE = '#F27A2A';

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function scoreColor(score: number): string {
  if (score < 40) return '#E05252';
  if (score < 65) return '#F27A2A';
  if (score < 85) return '#F0C744';
  return '#22A168';
}

// ─── PDF Builder helper class ───
class PdfBuilder {
  doc: jsPDF;
  y: number;
  margin: number;
  pageWidth: number;
  contentWidth: number;

  constructor() {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.y = 25;
    this.margin = 20;
    this.pageWidth = 210;
    this.contentWidth = this.pageWidth - this.margin * 2;
  }

  checkBreak(needed: number) {
    if (this.y + needed > 272) {
      this.doc.addPage();
      this.y = 25;
    }
  }

  // Get line height for a given font size (in mm)
  lineH(size: number): number {
    return size * 0.38;
  }

  // Calculate wrapped text height before drawing
  textHeight(text: string, size: number, maxWidth: number): number {
    this.doc.setFontSize(size);
    this.doc.setFont('helvetica', 'normal');
    const lines = this.doc.splitTextToSize(text, maxWidth);
    return lines.length * this.lineH(size) + (lines.length - 1) * 0.5;
  }

  text(text: string, x: number, options: {
    size?: number; color?: string; bold?: boolean; maxWidth?: number; align?: 'left' | 'right';
  } = {}): number {
    const { size = 9, color = PRIMARY, bold = false, maxWidth, align = 'left' } = options;
    this.doc.setFontSize(size);
    this.doc.setTextColor(...hexToRgb(color));
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');

    if (maxWidth) {
      const lines = this.doc.splitTextToSize(text, maxWidth) as string[];
      const lh = this.lineH(size) + 0.5;
      for (const line of lines) {
        this.doc.text(line, x, this.y);
        this.y += lh;
      }
      return lines.length * lh;
    }

    if (align === 'right') {
      const w = this.doc.getTextWidth(text);
      this.doc.text(text, x - w, this.y);
    } else {
      this.doc.text(text, x, this.y);
    }
    return this.lineH(size);
  }

  // Section header with uppercase label
  sectionHeader(label: string) {
    this.checkBreak(12);
    this.y += 3;
    this.doc.setFillColor(...hexToRgb(SURFACE));
    this.doc.roundedRect(this.margin, this.y - 3.5, this.contentWidth, 7, 1, 1, 'F');
    this.doc.setFontSize(7);
    this.doc.setTextColor(...hexToRgb(SECONDARY));
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(label, this.margin + 4, this.y);
    this.y += 7;
  }

  // Thin horizontal line
  separator() {
    this.doc.setDrawColor(...hexToRgb(BORDER));
    this.doc.setLineWidth(0.2);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.y += 3;
  }

  // Progress bar
  progressBar(x: number, w: number, pct: number, color: string) {
    this.doc.setFillColor(...hexToRgb(BORDER));
    this.doc.roundedRect(x, this.y, w, 2.5, 1, 1, 'F');
    if (pct > 0) {
      this.doc.setFillColor(...hexToRgb(color));
      this.doc.roundedRect(x, this.y, Math.max(2, w * (pct / 100)), 2.5, 1, 1, 'F');
    }
    this.y += 5;
  }

  // Card with white background and border
  cardStart() {
    // We just add padding — the card visual is implied by spacing
    this.y += 1;
  }

  gap(mm = 3) {
    this.y += mm;
  }

  // Add footer to all pages
  addFooters(leftText: string) {
    const total = this.doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(7);
      this.doc.setTextColor(...hexToRgb(MUTED));
      this.doc.text(leftText, this.margin, 287);
      this.doc.text(`${i} / ${total}`, this.pageWidth - this.margin - 8, 287);
      // Top line on non-first pages
      if (i > 1) {
        this.doc.setDrawColor(...hexToRgb(BORDER));
        this.doc.setLineWidth(0.2);
        this.doc.line(this.margin, 20, this.pageWidth - this.margin, 20);
      }
    }
  }
}

// ═══════════════════════════════════════
// SEO Report PDF
// ═══════════════════════════════════════

export function generateSeoReportPdf(report: Report): void {
  const b = new PdfBuilder();
  const { crawlResult, technicalScore, editorialAnalysis } = report;
  const editorialScore = editorialAnalysis?.score_editorial ?? 0;
  const combinedScore = editorialAnalysis
    ? Math.round((technicalScore.total + editorialScore) / 2)
    : technicalScore.total;

  // ─── Header ───
  b.text('Mamie SEO', b.margin, { size: 14, bold: true });
  b.y += 5;
  b.text('Rapport d\'analyse SEO', b.margin, { size: 8, color: MUTED });
  b.y += 5;
  b.text(report.url, b.margin, { size: 9, color: SECONDARY });
  b.y += 1;
  b.text(new Date(report.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }), b.pageWidth - b.margin, { size: 8, color: MUTED, align: 'right' });
  b.y += 3;
  b.separator();
  b.gap(2);

  // ─── Score global ───
  b.doc.setFillColor(...hexToRgb(WHITE));
  b.doc.roundedRect(b.margin, b.y, b.contentWidth, 22, 3, 3, 'FD');
  b.doc.setDrawColor(...hexToRgb(BORDER));
  b.doc.roundedRect(b.margin, b.y, b.contentWidth, 22, 3, 3, 'S');

  const scoreCenterX = b.margin + b.contentWidth / 2;
  b.doc.setFontSize(8);
  b.doc.setTextColor(...hexToRgb(MUTED));
  b.doc.setFont('helvetica', 'bold');
  b.doc.text('SCORE GLOBAL', scoreCenterX, b.y + 7, { align: 'center' });

  b.doc.setFontSize(20);
  b.doc.setTextColor(...hexToRgb(scoreColor(combinedScore)));
  b.doc.setFont('helvetica', 'bold');
  b.doc.text(`${combinedScore}`, scoreCenterX - 4, b.y + 16);
  b.doc.setFontSize(9);
  b.doc.setTextColor(...hexToRgb(MUTED));
  b.doc.text('/100', scoreCenterX + 9, b.y + 16);

  if (editorialAnalysis) {
    b.doc.setFontSize(8);
    b.doc.setTextColor(...hexToRgb(SECONDARY));
    b.doc.text(`Technique: ${technicalScore.total}`, b.margin + 8, b.y + 16);
    b.doc.text(`Editorial: ${editorialScore}`, b.pageWidth - b.margin - 32, b.y + 16);
  }

  b.y += 28;

  // ─── Détection technique ───
  b.sectionHeader('CE QU\'ON A DETECTE');

  const cms = crawlResult.technologies.find(t => t.category === 'cms');
  const items = [
    `${crawlResult.totalUrlsCrawled} pages analysees`,
    cms ? `CMS : ${cms.name}` : null,
    `HTTPS : ${crawlResult.isHttps ? 'actif' : 'inactif'}`,
    `Temps de reponse : ${(crawlResult.homepageResponseTimeMs / 1000).toFixed(1)}s`,
    `Sitemap : ${crawlResult.sitemapFound ? `${crawlResult.sitemapUrls} URLs` : 'non trouve'}`,
  ].filter(Boolean) as string[];

  for (const item of items) {
    b.text(`  •  ${item}`, b.margin + 2, { size: 8.5, color: SECONDARY });
    b.y += 1;
  }
  b.gap(2);

  // ─── Critères techniques ───
  b.sectionHeader('SCORE TECHNIQUE DETAILLE');

  for (const c of technicalScore.criteria) {
    const pct = (c.score / c.maxScore) * 100;
    const color = scoreColor(pct);

    b.checkBreak(18);

    // Name + Score on same line
    b.doc.setFontSize(9);
    b.doc.setFont('helvetica', 'bold');
    b.doc.setTextColor(...hexToRgb(PRIMARY));
    b.doc.text(c.name, b.margin + 4, b.y);
    b.doc.setTextColor(...hexToRgb(color));
    b.doc.text(`${c.score}/${c.maxScore}`, b.pageWidth - b.margin - 4, b.y, { align: 'right' });
    b.y += 4;

    // Progress bar
    b.progressBar(b.margin + 4, b.contentWidth - 8, pct, color);

    // Description
    const descH = b.textHeight(c.details, 8, b.contentWidth - 10);
    b.checkBreak(descH + 2);
    b.text(c.details, b.margin + 4, { size: 8, color: SECONDARY, maxWidth: b.contentWidth - 10 });
    b.gap(3);
  }

  // ─── Analyse éditoriale ───
  if (editorialAnalysis) {
    b.sectionHeader('ANALYSE EDITORIALE');

    const dims: [string, { score: number; resume: string; point_fort: string; point_amelioration: string }][] = [
      ['Comprehension de l\'activite', editorialAnalysis.comprehension_activite],
      ['Coherence des offres', editorialAnalysis.coherence_offres],
      ['Signaux de confiance', editorialAnalysis.signaux_confiance],
      ['Appels a l\'action', editorialAnalysis.call_to_action],
      ['Coherence tonale', editorialAnalysis.coherence_tonale],
    ];

    for (const [title, dim] of dims) {
      const totalH = 6 + b.textHeight(dim.resume, 8, b.contentWidth - 10) + 10
        + b.textHeight(dim.point_fort, 8, b.contentWidth - 14)
        + b.textHeight(dim.point_amelioration, 8, b.contentWidth - 14);
      b.checkBreak(Math.min(totalH, 50));

      // Title + score
      b.doc.setFontSize(9.5);
      b.doc.setFont('helvetica', 'bold');
      b.doc.setTextColor(...hexToRgb(PRIMARY));
      b.doc.text(title, b.margin + 4, b.y);
      b.doc.setTextColor(...hexToRgb(scoreColor(dim.score)));
      b.doc.text(`${dim.score}`, b.pageWidth - b.margin - 4, b.y, { align: 'right' });
      b.y += 5;

      // Resume
      b.text(dim.resume, b.margin + 4, { size: 8, color: SECONDARY, maxWidth: b.contentWidth - 10 });
      b.gap(1);

      // Point fort
      b.text(`+ ${dim.point_fort}`, b.margin + 6, { size: 8, color: GREEN, maxWidth: b.contentWidth - 14 });
      b.gap(0.5);

      // Point amelioration
      b.text(`- ${dim.point_amelioration}`, b.margin + 6, { size: 8, color: ORANGE, maxWidth: b.contentWidth - 14 });
      b.gap(3);

      // Thin separator between dimensions
      b.doc.setDrawColor(...hexToRgb(BORDER));
      b.doc.setLineWidth(0.1);
      b.doc.line(b.margin + 4, b.y, b.pageWidth - b.margin - 4, b.y);
      b.y += 3;
    }

    // ─── Mots-clés ───
    if (editorialAnalysis.mots_cles_metier) {
      b.sectionHeader('MOTS-CLES');
      b.text(`Detectes : ${editorialAnalysis.mots_cles_metier.mots_detectes.join(', ')}`, b.margin + 4, {
        size: 8.5, color: GREEN, maxWidth: b.contentWidth - 10
      });
      b.gap(1);
      b.text(`Manquants : ${editorialAnalysis.mots_cles_metier.mots_manquants_suggeres.join(', ')}`, b.margin + 4, {
        size: 8.5, color: ORANGE, maxWidth: b.contentWidth - 10
      });
      b.gap(4);
    }

    // ─── Plan d'action ───
    if (editorialAnalysis.plan_action_prioritaire?.length > 0) {
      b.sectionHeader('PLAN D\'ACTION PRIORISE');

      for (const action of editorialAnalysis.plan_action_prioritaire) {
        b.checkBreak(12);

        // Circle with number
        b.doc.setFillColor(...hexToRgb(SURFACE));
        b.doc.circle(b.margin + 7, b.y - 1, 3, 'F');
        b.doc.setFontSize(8);
        b.doc.setTextColor(...hexToRgb(PRIMARY));
        b.doc.setFont('helvetica', 'bold');
        b.doc.text(`${action.priorite}`, b.margin + 7, b.y, { align: 'center' });

        // Action text
        b.text(action.titre, b.margin + 14, { size: 9, bold: true, maxWidth: b.contentWidth - 18 });

        b.text(`Impact: ${action.impact}  •  ${action.difficulte}  •  ~${action.temps_estime}`, b.margin + 14, {
          size: 7, color: MUTED
        });
        b.y += 3;
      }
    }
  }

  b.addFooters('Mamie SEO — mamie-seo.vercel.app');

  const domain = new URL(report.url).hostname.replace(/\./g, '-');
  b.doc.save(`mamie-seo-rapport-${domain}.pdf`);
}

// ═══════════════════════════════════════
// Deep Page Analysis PDF
// ═══════════════════════════════════════

export function generateDeepAnalysisPdf(
  analysis: DeepPageAnalysis,
  pageUrl: string,
  siteUrl: string
): void {
  const b = new PdfBuilder();

  // ─── Header ───
  b.text('Mamie SEO', b.margin, { size: 14, bold: true });
  b.y += 5;
  b.text('Analyse de page approfondie', b.margin, { size: 8, color: MUTED });
  b.y += 5;

  let displayUrl = pageUrl;
  try { displayUrl = new URL(pageUrl).pathname || pageUrl; } catch { /* */ }
  b.text(displayUrl, b.margin, { size: 9, color: SECONDARY, maxWidth: b.contentWidth });
  b.gap(2);
  b.separator();
  b.gap(2);

  // ─── Score + resume ───
  b.doc.setFillColor(...hexToRgb(WHITE));
  b.doc.roundedRect(b.margin, b.y, b.contentWidth, 18, 3, 3, 'FD');
  b.doc.setDrawColor(...hexToRgb(BORDER));
  b.doc.roundedRect(b.margin, b.y, b.contentWidth, 18, 3, 3, 'S');

  b.doc.setFontSize(18);
  b.doc.setTextColor(...hexToRgb(scoreColor(analysis.score_global)));
  b.doc.setFont('helvetica', 'bold');
  b.doc.text(`${analysis.score_global}`, b.margin + 12, b.y + 12);
  b.doc.setFontSize(8);
  b.doc.setTextColor(...hexToRgb(MUTED));
  b.doc.text('/100', b.margin + 24, b.y + 12);

  // Resume inside score card
  b.doc.setFontSize(8);
  b.doc.setTextColor(...hexToRgb(SECONDARY));
  b.doc.setFont('helvetica', 'normal');
  const summaryLines = b.doc.splitTextToSize(analysis.resume_executif, b.contentWidth - 45);
  b.doc.text(summaryLines.slice(0, 3), b.margin + 35, b.y + 7);

  b.y += 24;

  // ─── Scores par dimension ───
  b.sectionHeader('SCORES PAR DIMENSION');

  for (const [, dim] of Object.entries(analysis.scores_par_dimension)) {
    b.checkBreak(9);
    b.doc.setFontSize(8.5);
    b.doc.setFont('helvetica', 'normal');
    b.doc.setTextColor(...hexToRgb(PRIMARY));
    b.doc.text(dim.label, b.margin + 4, b.y);
    b.doc.setFont('helvetica', 'bold');
    b.doc.setTextColor(...hexToRgb(scoreColor(dim.score)));
    b.doc.text(`${dim.score}`, b.pageWidth - b.margin - 4, b.y, { align: 'right' });
    b.y += 3.5;
    b.progressBar(b.margin + 4, b.contentWidth - 8, dim.score, scoreColor(dim.score));
  }
  b.gap(2);

  // ─── Annotations ───
  b.sectionHeader('ANNOTATIONS');

  const typeLabels: Record<string, string> = {
    critique: 'CRITIQUE', avertissement: 'ATTENTION', positif: 'POSITIF', info: 'INFO'
  };
  const typeColors: Record<string, string> = {
    critique: '#E05252', avertissement: '#F27A2A', positif: '#22A168', info: '#3B82F6'
  };

  for (const ann of analysis.annotations) {
    const obsH = b.textHeight(ann.observation, 8, b.contentWidth - 14);
    const recH = b.textHeight(ann.recommandation, 8, b.contentWidth - 14);
    b.checkBreak(15 + obsH + recH);

    const tc = typeColors[ann.type] || SECONDARY;

    // Pin circle + type badge
    b.doc.setFillColor(...hexToRgb(tc));
    b.doc.circle(b.margin + 6, b.y - 1, 3.5, 'F');
    b.doc.setFontSize(8);
    b.doc.setTextColor(255, 255, 255);
    b.doc.setFont('helvetica', 'bold');
    b.doc.text(`${ann.id}`, b.margin + 6, b.y, { align: 'center' });

    b.doc.setFontSize(6.5);
    b.doc.setTextColor(...hexToRgb(tc));
    b.doc.text(typeLabels[ann.type] || ann.type, b.margin + 12, b.y - 0.5);

    b.doc.setFontSize(7);
    b.doc.setTextColor(...hexToRgb(MUTED));
    b.doc.text(ann.zone, b.margin + 12, b.y + 2.5);
    b.y += 5;

    // Title
    b.text(ann.titre, b.margin + 4, { size: 9.5, bold: true, maxWidth: b.contentWidth - 10 });
    b.gap(0.5);

    // Observation
    b.text(ann.observation, b.margin + 4, { size: 8, color: SECONDARY, maxWidth: b.contentWidth - 10 });
    b.gap(1);

    // Recommendation (in a light bg)
    const recStartY = b.y;
    b.text(ann.recommandation, b.margin + 6, { size: 8, color: PRIMARY, maxWidth: b.contentWidth - 14 });
    // Draw a subtle left bar for the recommendation
    b.doc.setFillColor(...hexToRgb(tc));
    b.doc.rect(b.margin + 3.5, recStartY - 2.5, 0.8, b.y - recStartY + 1, 'F');
    b.gap(1);

    // Meta
    b.text(`Impact: ${ann.impact}  •  ${ann.difficulte}`, b.margin + 4, { size: 7, color: MUTED });
    b.y += 2;

    // Separator
    b.doc.setDrawColor(...hexToRgb(BORDER));
    b.doc.setLineWidth(0.1);
    b.doc.line(b.margin + 4, b.y, b.pageWidth - b.margin - 4, b.y);
    b.y += 3;
  }

  // ─── Plan d'action ───
  if (analysis.plan_action?.length > 0) {
    b.sectionHeader('PLAN D\'ACTION');

    for (const action of analysis.plan_action) {
      b.checkBreak(12);

      b.doc.setFillColor(...hexToRgb(SURFACE));
      b.doc.circle(b.margin + 7, b.y - 1, 3, 'F');
      b.doc.setFontSize(8);
      b.doc.setTextColor(...hexToRgb(PRIMARY));
      b.doc.setFont('helvetica', 'bold');
      b.doc.text(`${action.priorite}`, b.margin + 7, b.y, { align: 'center' });

      b.text(action.action, b.margin + 14, { size: 9, bold: true, maxWidth: b.contentWidth - 18 });
      b.text(`${action.categorie}  •  Impact: ${action.impact}  •  ${action.difficulte}  •  ~${action.temps_estime}`, b.margin + 14, {
        size: 7, color: MUTED
      });
      b.y += 3;
    }
  }

  // ─── Verdict ───
  b.checkBreak(20);
  b.sectionHeader('VERDICT');
  b.text(analysis.verdict_final, b.margin + 4, { size: 9, maxWidth: b.contentWidth - 8 });

  b.addFooters('Mamie SEO — mamie-seo.vercel.app');

  let filename = 'homepage';
  try { filename = new URL(pageUrl).pathname.replace(/\//g, '-').replace(/^-|-$/g, '') || 'homepage'; } catch { /* */ }
  b.doc.save(`mamie-seo-analyse-${filename}.pdf`);
}
