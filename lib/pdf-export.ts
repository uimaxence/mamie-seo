import { jsPDF } from 'jspdf';
import type { Report, DeepPageAnalysis } from './types';

// ─── Colors (new DA) ───
const PRIMARY = '#171717';
const SECONDARY = '#525252';
const MUTED = '#a3a3a3';
const BORDER = '#e5e5e5';
const WHITE = '#FFFFFF';
const SURFACE = '#fafafa';
const GREEN = '#2D8A5E';
const ORANGE = '#E05A2B';

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function scoreColor(score: number): string {
  if (score < 40) return '#C03030';
  if (score < 65) return '#E05A2B';
  if (score < 85) return '#E05A2B';
  return '#2D8A5E';
}

// ─── PDF Builder ───
class PdfBuilder {
  doc: jsPDF;
  y: number;
  margin: number;
  pageWidth: number;
  contentWidth: number;

  constructor() {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.y = 20;
    this.margin = 18;
    this.pageWidth = 210;
    this.contentWidth = this.pageWidth - this.margin * 2;
  }

  checkBreak(needed: number) {
    if (this.y + needed > 270) {
      this.doc.addPage();
      this.y = 22;
    }
  }

  lineH(size: number): number {
    return size * 0.45;
  }

  textHeight(text: string, size: number, maxWidth: number): number {
    this.doc.setFontSize(size);
    this.doc.setFont('helvetica', 'normal');
    const lines = this.doc.splitTextToSize(text, maxWidth);
    return lines.length * (this.lineH(size) + 1);
  }

  text(text: string, x: number, options: {
    size?: number; color?: string; bold?: boolean; maxWidth?: number; align?: 'left' | 'right';
  } = {}): number {
    const { size = 9, color = PRIMARY, bold = false, maxWidth, align = 'left' } = options;
    this.doc.setFontSize(size);
    this.doc.setTextColor(...hexToRgb(color));
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    this.doc.setCharSpace(0);

    if (maxWidth) {
      const lines = this.doc.splitTextToSize(text, maxWidth) as string[];
      const lh = this.lineH(size) + 1;
      for (const line of lines) {
        this.doc.text(line, x, this.y);
        this.y += lh;
      }
      return lines.length * lh;
    }

    if (align === 'right') {
      this.doc.text(text, x, this.y, { align: 'right' });
    } else {
      this.doc.text(text, x, this.y);
    }
    return this.lineH(size);
  }

  sectionHeader(label: string) {
    this.checkBreak(14);
    this.y += 5;
    this.doc.setFillColor(...hexToRgb(SURFACE));
    this.doc.roundedRect(this.margin, this.y - 4, this.contentWidth, 8, 1.5, 1.5, 'F');
    this.doc.setFontSize(7);
    this.doc.setTextColor(...hexToRgb(SECONDARY));
    this.doc.setFont('helvetica', 'bold');
    this.doc.setCharSpace(0.3);
    this.doc.text(label, this.margin + 4, this.y);
    this.doc.setCharSpace(0);
    this.y += 8;
  }

  separator() {
    this.doc.setDrawColor(...hexToRgb(BORDER));
    this.doc.setLineWidth(0.2);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.y += 4;
  }

  progressBar(x: number, w: number, pct: number, color: string) {
    this.doc.setFillColor(...hexToRgb(BORDER));
    this.doc.roundedRect(x, this.y, w, 2.5, 1, 1, 'F');
    if (pct > 0) {
      this.doc.setFillColor(...hexToRgb(color));
      this.doc.roundedRect(x, this.y, Math.max(2, w * (pct / 100)), 2.5, 1, 1, 'F');
    }
    this.y += 6;
  }

  gap(mm = 3) {
    this.y += mm;
  }

  addFooters(leftText: string) {
    const total = this.doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(7);
      this.doc.setTextColor(...hexToRgb(MUTED));
      this.doc.setCharSpace(0);
      this.doc.text(leftText, this.margin, 287);
      this.doc.text(`${i} / ${total}`, this.pageWidth - this.margin, 287, { align: 'right' });
      if (i > 1) {
        this.doc.setDrawColor(...hexToRgb(BORDER));
        this.doc.setLineWidth(0.2);
        this.doc.line(this.margin, 18, this.pageWidth - this.margin, 18);
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
  b.text('Mamie SEO', b.margin, { size: 16, bold: true });
  b.y += 7;
  b.text('Rapport d\'analyse SEO', b.margin, { size: 9, color: MUTED });
  b.y += 7;
  b.text(report.url, b.margin, { size: 10, color: SECONDARY, maxWidth: b.contentWidth - 40 });
  b.y += 2;
  b.text(new Date(report.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }), b.pageWidth - b.margin, { size: 8, color: MUTED, align: 'right' });
  b.y += 5;
  b.separator();
  b.gap(4);

  // ─── Score global ───
  const scoreBoxH = 26;
  b.doc.setFillColor(...hexToRgb(WHITE));
  b.doc.roundedRect(b.margin, b.y, b.contentWidth, scoreBoxH, 3, 3, 'FD');
  b.doc.setDrawColor(...hexToRgb(BORDER));
  b.doc.roundedRect(b.margin, b.y, b.contentWidth, scoreBoxH, 3, 3, 'S');

  const scoreCenterX = b.margin + b.contentWidth / 2;
  b.doc.setFontSize(7);
  b.doc.setTextColor(...hexToRgb(MUTED));
  b.doc.setFont('helvetica', 'bold');
  b.doc.setCharSpace(0.4);
  b.doc.text('SCORE GLOBAL', scoreCenterX, b.y + 8, { align: 'center' });
  b.doc.setCharSpace(0);

  b.doc.setFontSize(24);
  b.doc.setTextColor(...hexToRgb(scoreColor(combinedScore)));
  b.doc.setFont('helvetica', 'bold');
  const scoreStr = `${combinedScore}`;
  b.doc.text(scoreStr, scoreCenterX, b.y + 19, { align: 'center' });
  b.doc.setFontSize(10);
  b.doc.setTextColor(...hexToRgb(MUTED));
  b.doc.setFont('helvetica', 'normal');
  const scoreW = b.doc.getTextWidth(scoreStr);
  b.doc.text('/100', scoreCenterX + scoreW / 2 + 2, b.y + 19);

  if (editorialAnalysis) {
    b.doc.setFontSize(8);
    b.doc.setFont('helvetica', 'normal');
    b.doc.setTextColor(...hexToRgb(SECONDARY));
    b.doc.text(`Technique : ${technicalScore.total}`, b.margin + 10, b.y + 19);
    b.doc.text(`Editorial : ${editorialScore}`, b.pageWidth - b.margin - 10, b.y + 19, { align: 'right' });
  }

  b.y += scoreBoxH + 8;

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
    b.text(`  •  ${item}`, b.margin + 4, { size: 8.5, color: SECONDARY });
    b.y += 3;
  }
  b.gap(4);

  // ─── Critères techniques ───
  b.sectionHeader('SCORE TECHNIQUE DETAILLE');

  for (const c of technicalScore.criteria) {
    const pct = (c.score / c.maxScore) * 100;
    const color = scoreColor(pct);

    b.checkBreak(22);

    b.doc.setFontSize(9.5);
    b.doc.setFont('helvetica', 'bold');
    b.doc.setTextColor(...hexToRgb(PRIMARY));
    b.doc.setCharSpace(0);
    b.doc.text(c.name, b.margin + 4, b.y);
    b.doc.setTextColor(...hexToRgb(color));
    b.doc.text(`${c.score}/${c.maxScore}`, b.pageWidth - b.margin - 4, b.y, { align: 'right' });
    b.y += 5;

    b.progressBar(b.margin + 4, b.contentWidth - 8, pct, color);

    const descH = b.textHeight(c.details, 8, b.contentWidth - 10);
    b.checkBreak(descH + 4);
    b.text(c.details, b.margin + 4, { size: 8, color: SECONDARY, maxWidth: b.contentWidth - 10 });
    b.gap(5);
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
      const totalH = 8 + b.textHeight(dim.resume, 8, b.contentWidth - 10) + 12
        + b.textHeight(dim.point_fort, 8, b.contentWidth - 14)
        + b.textHeight(dim.point_amelioration, 8, b.contentWidth - 14);
      b.checkBreak(Math.min(totalH, 55));

      b.doc.setFontSize(10);
      b.doc.setFont('helvetica', 'bold');
      b.doc.setTextColor(...hexToRgb(PRIMARY));
      b.doc.setCharSpace(0);
      b.doc.text(title, b.margin + 4, b.y);
      b.doc.setTextColor(...hexToRgb(scoreColor(dim.score)));
      b.doc.text(`${dim.score}`, b.pageWidth - b.margin - 4, b.y, { align: 'right' });
      b.y += 6;

      b.text(dim.resume, b.margin + 4, { size: 8.5, color: SECONDARY, maxWidth: b.contentWidth - 10 });
      b.gap(2);

      b.text(`+ ${dim.point_fort}`, b.margin + 6, { size: 8, color: GREEN, maxWidth: b.contentWidth - 14 });
      b.gap(1.5);

      b.text(`- ${dim.point_amelioration}`, b.margin + 6, { size: 8, color: ORANGE, maxWidth: b.contentWidth - 14 });
      b.gap(4);

      b.doc.setDrawColor(...hexToRgb(BORDER));
      b.doc.setLineWidth(0.1);
      b.doc.line(b.margin + 4, b.y, b.pageWidth - b.margin - 4, b.y);
      b.y += 5;
    }

    // ─── Mots-clés ───
    if (editorialAnalysis.mots_cles_metier) {
      b.sectionHeader('MOTS-CLES');
      b.text(`Detectes : ${editorialAnalysis.mots_cles_metier.mots_detectes.join(', ')}`, b.margin + 4, {
        size: 8.5, color: GREEN, maxWidth: b.contentWidth - 10
      });
      b.gap(2);
      b.text(`Manquants : ${editorialAnalysis.mots_cles_metier.mots_manquants_suggeres.join(', ')}`, b.margin + 4, {
        size: 8.5, color: ORANGE, maxWidth: b.contentWidth - 10
      });
      b.gap(5);
    }

    // ─── Plan d'action ───
    if (editorialAnalysis.plan_action_prioritaire?.length > 0) {
      b.sectionHeader('PLAN D\'ACTION PRIORISE');

      for (const action of editorialAnalysis.plan_action_prioritaire) {
        b.checkBreak(16);

        b.doc.setFillColor(...hexToRgb(SURFACE));
        b.doc.circle(b.margin + 7, b.y - 1, 3.5, 'F');
        b.doc.setFontSize(8);
        b.doc.setTextColor(...hexToRgb(PRIMARY));
        b.doc.setFont('helvetica', 'bold');
        b.doc.setCharSpace(0);
        b.doc.text(`${action.priorite}`, b.margin + 7, b.y, { align: 'center' });

        b.text(action.titre, b.margin + 15, { size: 9.5, bold: true, maxWidth: b.contentWidth - 20 });
        b.gap(0.5);
        b.text(`Impact: ${action.impact}  •  ${action.difficulte}  •  ~${action.temps_estime}`, b.margin + 15, {
          size: 7.5, color: MUTED
        });
        b.y += 5;
      }
    }
  }

  b.addFooters('Mamie SEO — mamie-seo.fr');

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
  b.text('Mamie SEO', b.margin, { size: 16, bold: true });
  b.y += 7;
  b.text('Analyse de page approfondie', b.margin, { size: 9, color: MUTED });
  b.y += 7;

  let displayUrl = pageUrl;
  try { displayUrl = new URL(pageUrl).pathname || pageUrl; } catch { /* */ }
  b.text(displayUrl, b.margin, { size: 10, color: SECONDARY, maxWidth: b.contentWidth });
  b.gap(3);
  b.separator();
  b.gap(4);

  // ─── Score + resume ───
  const scoreBoxH = 22;
  b.doc.setFillColor(...hexToRgb(WHITE));
  b.doc.roundedRect(b.margin, b.y, b.contentWidth, scoreBoxH, 3, 3, 'FD');
  b.doc.setDrawColor(...hexToRgb(BORDER));
  b.doc.roundedRect(b.margin, b.y, b.contentWidth, scoreBoxH, 3, 3, 'S');

  b.doc.setFontSize(20);
  b.doc.setTextColor(...hexToRgb(scoreColor(analysis.score_global)));
  b.doc.setFont('helvetica', 'bold');
  b.doc.setCharSpace(0);
  b.doc.text(`${analysis.score_global}`, b.margin + 14, b.y + 14);
  b.doc.setFontSize(9);
  b.doc.setTextColor(...hexToRgb(MUTED));
  b.doc.setFont('helvetica', 'normal');
  b.doc.text('/100', b.margin + 27, b.y + 14);

  b.doc.setFontSize(8);
  b.doc.setTextColor(...hexToRgb(SECONDARY));
  b.doc.setFont('helvetica', 'normal');
  const summaryLines = b.doc.splitTextToSize(analysis.resume_executif, b.contentWidth - 50);
  b.doc.text(summaryLines.slice(0, 4), b.margin + 38, b.y + 7);

  b.y += scoreBoxH + 8;

  // ─── Scores par dimension ───
  b.sectionHeader('SCORES PAR DIMENSION');

  for (const [, dim] of Object.entries(analysis.scores_par_dimension)) {
    b.checkBreak(12);
    b.doc.setFontSize(8.5);
    b.doc.setFont('helvetica', 'normal');
    b.doc.setTextColor(...hexToRgb(PRIMARY));
    b.doc.setCharSpace(0);
    b.doc.text(dim.label, b.margin + 4, b.y);
    b.doc.setFont('helvetica', 'bold');
    b.doc.setTextColor(...hexToRgb(scoreColor(dim.score)));
    b.doc.text(`${dim.score}`, b.pageWidth - b.margin - 4, b.y, { align: 'right' });
    b.y += 4;
    b.progressBar(b.margin + 4, b.contentWidth - 8, dim.score, scoreColor(dim.score));
    b.gap(1);
  }
  b.gap(3);

  // ─── Annotations ───
  b.sectionHeader('ANNOTATIONS');

  const typeLabels: Record<string, string> = {
    critique: 'CRITIQUE', avertissement: 'ATTENTION', positif: 'POSITIF', info: 'INFO'
  };
  const typeColors: Record<string, string> = {
    critique: '#C03030', avertissement: '#E05A2B', positif: '#2D8A5E', info: '#3B82F6'
  };

  for (const ann of analysis.annotations) {
    const obsH = b.textHeight(ann.observation, 8, b.contentWidth - 14);
    const recH = b.textHeight(ann.recommandation, 8, b.contentWidth - 14);
    b.checkBreak(20 + obsH + recH);

    const tc = typeColors[ann.type] || SECONDARY;

    // Pin + type + zone
    b.doc.setFillColor(...hexToRgb(tc));
    b.doc.circle(b.margin + 6, b.y - 1, 3.5, 'F');
    b.doc.setFontSize(8);
    b.doc.setTextColor(255, 255, 255);
    b.doc.setFont('helvetica', 'bold');
    b.doc.setCharSpace(0);
    b.doc.text(`${ann.id}`, b.margin + 6, b.y, { align: 'center' });

    b.doc.setFontSize(7);
    b.doc.setTextColor(...hexToRgb(tc));
    b.doc.text(typeLabels[ann.type] || ann.type, b.margin + 13, b.y - 1);

    b.doc.setFontSize(7);
    b.doc.setTextColor(...hexToRgb(MUTED));
    b.doc.text(ann.zone, b.margin + 13, b.y + 3);
    b.y += 7;

    // Title
    b.text(ann.titre, b.margin + 4, { size: 10, bold: true, maxWidth: b.contentWidth - 10 });
    b.gap(1);

    // Observation
    b.text(ann.observation, b.margin + 4, { size: 8.5, color: SECONDARY, maxWidth: b.contentWidth - 10 });
    b.gap(2);

    // Recommendation with left bar
    const recStartY = b.y;
    b.text(ann.recommandation, b.margin + 7, { size: 8.5, color: PRIMARY, maxWidth: b.contentWidth - 14 });
    b.doc.setFillColor(...hexToRgb(tc));
    b.doc.rect(b.margin + 4, recStartY - 3, 1, b.y - recStartY + 1, 'F');
    b.gap(2);

    // Meta
    b.text(`Impact: ${ann.impact}  •  ${ann.difficulte}`, b.margin + 4, { size: 7.5, color: MUTED });
    b.y += 4;

    b.doc.setDrawColor(...hexToRgb(BORDER));
    b.doc.setLineWidth(0.1);
    b.doc.line(b.margin + 4, b.y, b.pageWidth - b.margin - 4, b.y);
    b.y += 5;
  }

  // ─── Plan d'action ───
  if (analysis.plan_action?.length > 0) {
    b.sectionHeader('PLAN D\'ACTION');

    for (const action of analysis.plan_action) {
      b.checkBreak(16);

      b.doc.setFillColor(...hexToRgb(SURFACE));
      b.doc.circle(b.margin + 7, b.y - 1, 3.5, 'F');
      b.doc.setFontSize(8);
      b.doc.setTextColor(...hexToRgb(PRIMARY));
      b.doc.setFont('helvetica', 'bold');
      b.doc.setCharSpace(0);
      b.doc.text(`${action.priorite}`, b.margin + 7, b.y, { align: 'center' });

      b.text(action.action, b.margin + 15, { size: 9.5, bold: true, maxWidth: b.contentWidth - 20 });
      b.gap(0.5);
      b.text(`${action.categorie}  •  Impact: ${action.impact}  •  ${action.difficulte}  •  ~${action.temps_estime}`, b.margin + 15, {
        size: 7.5, color: MUTED
      });
      b.y += 5;
    }
  }

  // ─── Verdict ───
  b.checkBreak(24);
  b.sectionHeader('VERDICT');
  b.text(analysis.verdict_final, b.margin + 4, { size: 9.5, maxWidth: b.contentWidth - 8 });

  b.addFooters('Mamie SEO — mamie-seo.fr');

  let filename = 'homepage';
  try { filename = new URL(pageUrl).pathname.replace(/\//g, '-').replace(/^-|-$/g, '') || 'homepage'; } catch { /* */ }
  b.doc.save(`mamie-seo-analyse-${filename}.pdf`);
}
