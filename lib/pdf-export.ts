import { jsPDF } from 'jspdf';
import type { Report, DeepPageAnalysis } from './types';

// ─── Colors ───
const PRIMARY = '#1A1A18';
const SECONDARY = '#73726C';
const MUTED = '#C2C0B6';
const BORDER = '#EEEDEB';
const WHITE = '#FFFFFF';
const SURFACE = '#F8F8F7';

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function scoreColor(score: number): string {
  if (score < 40) return '#E05252';
  if (score < 65) return '#F27A2A';
  if (score < 85) return '#F0C744';
  return '#22A168';
}

// ─── SEO Report PDF ───

export function generateSeoReportPdf(report: Report): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const { crawlResult, technicalScore, editorialAnalysis } = report;
  const editorialScore = editorialAnalysis?.score_editorial ?? 0;
  const combinedScore = editorialAnalysis
    ? Math.round((technicalScore.total + editorialScore) / 2)
    : technicalScore.total;

  // ─── Helper functions ───
  function addPage() {
    doc.addPage();
    y = 20;
  }

  function checkPageBreak(needed: number) {
    if (y + needed > 275) addPage();
  }

  function drawText(text: string, x: number, yPos: number, options: {
    size?: number; color?: string; weight?: 'normal' | 'bold'; maxWidth?: number;
  } = {}) {
    const { size = 10, color = PRIMARY, weight = 'normal', maxWidth } = options;
    doc.setFontSize(size);
    doc.setTextColor(...hexToRgb(color));
    doc.setFont('helvetica', weight);
    if (maxWidth) {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, yPos);
      return lines.length * (size * 0.4);
    }
    doc.text(text, x, yPos);
    return size * 0.4;
  }

  function drawLine(x1: number, yPos: number, x2: number) {
    doc.setDrawColor(...hexToRgb(BORDER));
    doc.setLineWidth(0.3);
    doc.line(x1, yPos, x2, yPos);
  }

  function drawRect(x: number, yPos: number, w: number, h: number, fill: string, radius = 2) {
    doc.setFillColor(...hexToRgb(fill));
    doc.roundedRect(x, yPos, w, h, radius, radius, 'F');
  }

  // ─── Header ───
  drawText('MAMIE SEO', margin, y, { size: 16, weight: 'bold' });
  drawText('Rapport d\'analyse SEO', margin + 45, y, { size: 10, color: MUTED });
  y += 4;
  drawText(report.url, margin, y + 4, { size: 9, color: SECONDARY });
  drawText(new Date(report.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  }), pageWidth - margin, y + 4, { size: 8, color: MUTED });
  // Right-align date
  doc.setFontSize(8);
  const dateWidth = doc.getTextWidth(new Date(report.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }));
  doc.text(new Date(report.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), pageWidth - margin - dateWidth, y + 4);

  y += 12;
  drawLine(margin, y, pageWidth - margin);
  y += 8;

  // ─── Score global ───
  drawRect(margin, y, contentWidth, 28, WHITE, 3);
  doc.setDrawColor(...hexToRgb(BORDER));
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'S');

  drawText('SCORE GLOBAL', margin + contentWidth / 2 - 12, y + 6, { size: 7, color: MUTED, weight: 'bold' });
  drawText(`${combinedScore}`, margin + contentWidth / 2 - 5, y + 18, { size: 22, color: scoreColor(combinedScore), weight: 'bold' });
  drawText('/100', margin + contentWidth / 2 + 10, y + 18, { size: 9, color: MUTED });

  if (editorialAnalysis) {
    drawText(`Tech: ${technicalScore.total}`, margin + 10, y + 18, { size: 9, color: SECONDARY });
    drawText(`Éditorial: ${editorialScore}`, pageWidth - margin - 35, y + 18, { size: 9, color: SECONDARY });
  }

  y += 34;

  // ─── Ce qu'on a détecté ───
  drawText('CE QU\'ON A DÉTECTÉ', margin, y, { size: 7, color: MUTED, weight: 'bold' });
  y += 6;

  const cms = crawlResult.technologies.find(t => t.category === 'cms');
  const techItems = [
    `${crawlResult.totalUrlsCrawled} pages analysées`,
    cms ? `CMS : ${cms.name}` : null,
    `HTTPS : ${crawlResult.isHttps ? 'actif' : 'inactif'}`,
    `Temps de réponse : ${(crawlResult.homepageResponseTimeMs / 1000).toFixed(1)}s`,
    `Sitemap : ${crawlResult.sitemapFound ? `${crawlResult.sitemapUrls} URLs` : 'non trouvé'}`,
  ].filter(Boolean) as string[];

  for (const item of techItems) {
    drawText(`• ${item}`, margin + 4, y, { size: 9, color: SECONDARY });
    y += 4.5;
  }
  y += 4;

  // ─── Critères techniques ───
  drawText('SCORE TECHNIQUE DÉTAILLÉ', margin, y, { size: 7, color: MUTED, weight: 'bold' });
  y += 6;

  for (const criterion of technicalScore.criteria) {
    checkPageBreak(14);
    const pct = (criterion.score / criterion.maxScore) * 100;
    const color = scoreColor(pct);

    drawText(criterion.name, margin + 4, y, { size: 9, weight: 'bold' });
    drawText(`${criterion.score}/${criterion.maxScore}`, pageWidth - margin - 15, y, { size: 9, color, weight: 'bold' });
    y += 4;

    // Progress bar
    drawRect(margin + 4, y, contentWidth - 24, 2, SURFACE);
    drawRect(margin + 4, y, (contentWidth - 24) * (pct / 100), 2, color);
    y += 4;

    const detailHeight = drawText(criterion.details, margin + 4, y, { size: 8, color: SECONDARY, maxWidth: contentWidth - 8 });
    y += detailHeight + 4;
  }

  // ─── Analyse éditoriale ───
  if (editorialAnalysis) {
    checkPageBreak(20);
    y += 4;
    drawText('ANALYSE ÉDITORIALE', margin, y, { size: 7, color: MUTED, weight: 'bold' });
    y += 6;

    const dimensions: [string, { score: number; resume: string; point_fort: string; point_amelioration: string }][] = [
      ['Compréhension de l\'activité', editorialAnalysis.comprehension_activite],
      ['Cohérence des offres', editorialAnalysis.coherence_offres],
      ['Signaux de confiance', editorialAnalysis.signaux_confiance],
      ['Appels à l\'action', editorialAnalysis.call_to_action],
      ['Cohérence tonale', editorialAnalysis.coherence_tonale],
    ];

    for (const [title, dim] of dimensions) {
      checkPageBreak(28);
      drawText(title, margin + 4, y, { size: 9, weight: 'bold' });
      drawText(`${dim.score}/100`, pageWidth - margin - 18, y, { size: 9, color: scoreColor(dim.score), weight: 'bold' });
      y += 5;

      const resumeH = drawText(dim.resume, margin + 4, y, { size: 8, color: SECONDARY, maxWidth: contentWidth - 8 });
      y += resumeH + 2;

      drawText(`✓ ${dim.point_fort}`, margin + 4, y, { size: 8, color: '#22A168', maxWidth: contentWidth - 8 });
      y += 5;
      const amelH = drawText(`→ ${dim.point_amelioration}`, margin + 4, y, { size: 8, color: '#F27A2A', maxWidth: contentWidth - 8 });
      y += amelH + 5;
    }

    // ─── Mots-clés ───
    if (editorialAnalysis.mots_cles_metier) {
      checkPageBreak(20);
      drawText('MOTS-CLÉS', margin, y, { size: 7, color: MUTED, weight: 'bold' });
      y += 6;
      drawText(`Détectés : ${editorialAnalysis.mots_cles_metier.mots_detectes.join(', ')}`, margin + 4, y, { size: 8, color: '#22A168', maxWidth: contentWidth - 8 });
      y += 5;
      drawText(`Manquants : ${editorialAnalysis.mots_cles_metier.mots_manquants_suggeres.join(', ')}`, margin + 4, y, { size: 8, color: '#F27A2A', maxWidth: contentWidth - 8 });
      y += 8;
    }

    // ─── Plan d'action ───
    if (editorialAnalysis.plan_action_prioritaire?.length > 0) {
      checkPageBreak(20);
      drawText('PLAN D\'ACTION PRIORISÉ', margin, y, { size: 7, color: MUTED, weight: 'bold' });
      y += 6;

      for (const action of editorialAnalysis.plan_action_prioritaire) {
        checkPageBreak(10);
        drawText(`${action.priorite}.`, margin + 4, y, { size: 9, weight: 'bold' });
        const actionH = drawText(action.titre, margin + 12, y, { size: 9, maxWidth: contentWidth - 20 });
        y += 4;
        drawText(`Impact: ${action.impact} | ${action.difficulte} | ~${action.temps_estime}`, margin + 12, y, { size: 7, color: MUTED });
        y += actionH + 4;
      }
    }
  }

  // ─── Footer ───
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...hexToRgb(MUTED));
    doc.text('Mamie SEO — mamie-seo.vercel.app', margin, 290);
    doc.text(`${i} / ${totalPages}`, pageWidth - margin - 10, 290);
  }

  // Save
  const domain = new URL(report.url).hostname.replace(/\./g, '-');
  doc.save(`mamie-seo-rapport-${domain}.pdf`);
}

// ─── Deep Page Analysis PDF ───

export function generateDeepAnalysisPdf(
  analysis: DeepPageAnalysis,
  pageUrl: string,
  siteUrl: string
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  function checkPageBreak(needed: number) {
    if (y + needed > 275) { doc.addPage(); y = 20; }
  }

  function drawText(text: string, x: number, yPos: number, options: {
    size?: number; color?: string; weight?: 'normal' | 'bold'; maxWidth?: number;
  } = {}) {
    const { size = 10, color = PRIMARY, weight = 'normal', maxWidth } = options;
    doc.setFontSize(size);
    doc.setTextColor(...hexToRgb(color));
    doc.setFont('helvetica', weight);
    if (maxWidth) {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, yPos);
      return lines.length * (size * 0.4);
    }
    doc.text(text, x, yPos);
    return size * 0.4;
  }

  // Header
  drawText('MAMIE SEO', margin, y, { size: 16, weight: 'bold' });
  drawText('Analyse de page approfondie', margin + 45, y, { size: 10, color: MUTED });
  y += 6;
  drawText(pageUrl, margin, y, { size: 8, color: SECONDARY, maxWidth: contentWidth });
  y += 8;
  doc.setDrawColor(...hexToRgb(BORDER));
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Score
  drawText('SCORE GLOBAL', margin, y, { size: 7, color: MUTED, weight: 'bold' });
  drawText(`${analysis.score_global}/100`, margin + 35, y, { size: 14, color: scoreColor(analysis.score_global), weight: 'bold' });
  y += 8;

  // Executive summary
  const summaryH = drawText(analysis.resume_executif, margin, y, { size: 9, color: SECONDARY, maxWidth: contentWidth });
  y += summaryH + 6;

  // Scores by dimension
  drawText('SCORES PAR DIMENSION', margin, y, { size: 7, color: MUTED, weight: 'bold' });
  y += 6;

  for (const [, dim] of Object.entries(analysis.scores_par_dimension)) {
    checkPageBreak(8);
    drawText(dim.label, margin + 4, y, { size: 8 });
    drawText(`${dim.score}`, pageWidth - margin - 10, y, { size: 9, color: scoreColor(dim.score), weight: 'bold' });
    y += 3;

    doc.setFillColor(...hexToRgb(SURFACE));
    doc.roundedRect(margin + 4, y, contentWidth - 18, 1.5, 0.5, 0.5, 'F');
    doc.setFillColor(...hexToRgb(scoreColor(dim.score)));
    doc.roundedRect(margin + 4, y, (contentWidth - 18) * (dim.score / 100), 1.5, 0.5, 0.5, 'F');
    y += 5;
  }
  y += 4;

  // Annotations
  drawText('ANNOTATIONS', margin, y, { size: 7, color: MUTED, weight: 'bold' });
  y += 6;

  const typeLabels: Record<string, string> = {
    critique: 'CRITIQUE', avertissement: 'AVERTISSEMENT', positif: 'POSITIF', info: 'INFO'
  };
  const typeColors: Record<string, string> = {
    critique: '#E05252', avertissement: '#F27A2A', positif: '#22A168', info: '#3B82F6'
  };

  for (const ann of analysis.annotations) {
    checkPageBreak(24);
    const tc = typeColors[ann.type] || SECONDARY;

    drawText(`${ann.id}`, margin + 4, y, { size: 9, color: tc, weight: 'bold' });
    drawText(`[${typeLabels[ann.type] || ann.type}]`, margin + 10, y, { size: 7, color: tc });
    drawText(ann.zone, margin + 38, y, { size: 7, color: MUTED });
    y += 5;

    drawText(ann.titre, margin + 4, y, { size: 9, weight: 'bold', maxWidth: contentWidth - 8 });
    y += 5;

    const obsH = drawText(ann.observation, margin + 4, y, { size: 8, color: SECONDARY, maxWidth: contentWidth - 8 });
    y += obsH + 2;

    drawText('→ ' + ann.recommandation, margin + 4, y, { size: 8, color: '#1A1A18', maxWidth: contentWidth - 8 });
    y += 6;

    drawText(`Impact: ${ann.impact} | ${ann.difficulte}`, margin + 4, y, { size: 7, color: MUTED });
    y += 6;
  }

  // Action plan
  if (analysis.plan_action?.length > 0) {
    checkPageBreak(15);
    drawText('PLAN D\'ACTION', margin, y, { size: 7, color: MUTED, weight: 'bold' });
    y += 6;

    for (const action of analysis.plan_action) {
      checkPageBreak(10);
      drawText(`${action.priorite}.`, margin + 4, y, { size: 9, weight: 'bold' });
      drawText(action.action, margin + 12, y, { size: 9, maxWidth: contentWidth - 20 });
      y += 4;
      drawText(`${action.categorie} | Impact: ${action.impact} | ${action.difficulte} | ~${action.temps_estime}`, margin + 12, y, { size: 7, color: MUTED });
      y += 6;
    }
  }

  // Verdict
  checkPageBreak(15);
  y += 2;
  drawText('VERDICT', margin, y, { size: 7, color: MUTED, weight: 'bold' });
  y += 5;
  drawText(analysis.verdict_final, margin + 4, y, { size: 9, color: PRIMARY, maxWidth: contentWidth - 8 });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...hexToRgb(MUTED));
    doc.text('Mamie SEO — mamie-seo.vercel.app', margin, 290);
    doc.text(`${i} / ${totalPages}`, pageWidth - margin - 10, 290);
  }

  const pageDomain = new URL(pageUrl).pathname.replace(/\//g, '-').replace(/^-|-$/g, '') || 'homepage';
  doc.save(`mamie-seo-analyse-${pageDomain}.pdf`);
}
