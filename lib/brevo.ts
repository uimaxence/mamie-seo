import type { Report } from './types';

const BREVO_API_KEY = process.env.BREVO_API_KEY!;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL!;

function buildScoreColor(score: number): string {
  if (score < 40) return '#E05252';
  if (score < 65) return '#F27A2A';
  if (score < 85) return '#F0C744';
  return '#22A168';
}

function buildReportEmailHtml(report: Report, reportUrl: string): string {
  const { technicalScore, editorialAnalysis, crawlResult } = report;
  const editorialScore = editorialAnalysis?.score_editorial ?? 0;
  const combinedScore = editorialAnalysis
    ? Math.round((technicalScore.total + editorialScore) / 2)
    : technicalScore.total;
  const scoreColor = buildScoreColor(combinedScore);

  const cms = crawlResult.technologies.find((t) => t.category === 'cms');

  const topIssues = [...technicalScore.criteria]
    .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)
    .slice(0, 3)
    .map((c) => `<li style="margin-bottom:8px;color:#73726C;font-size:14px;">${c.name}: <strong style="color:${buildScoreColor((c.score / c.maxScore) * 100)}">${c.score}/${c.maxScore}</strong> — ${c.details}</li>`)
    .join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8F8F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:18px;font-weight:500;color:#1A1A18;margin:0 0 4px;">Mamie SEO</h1>
      <p style="font-size:12px;color:#C2C0B6;margin:0;text-transform:uppercase;letter-spacing:0.07em;">Rapport d'analyse SEO</p>
    </div>

    <!-- Score card -->
    <div style="background:#FFFFFF;border:1px solid #EEEDEB;border-radius:12px;padding:32px;text-align:center;margin-bottom:24px;">
      <p style="font-size:11px;color:#73726C;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 12px;">Score global</p>
      <p style="font-size:48px;font-weight:500;color:${scoreColor};margin:0;">${combinedScore}</p>
      <p style="font-size:12px;color:#73726C;margin:4px 0 0;">/100</p>
      ${editorialAnalysis ? `
      <div style="display:flex;justify-content:center;gap:24px;margin-top:20px;">
        <div><p style="font-size:18px;font-weight:500;color:#1A1A18;margin:0;">${technicalScore.total}</p><p style="font-size:10px;color:#73726C;text-transform:uppercase;margin:4px 0 0;">Technique</p></div>
        <div style="width:1px;background:#EEEDEB;"></div>
        <div><p style="font-size:18px;font-weight:500;color:#1A1A18;margin:0;">${editorialScore}</p><p style="font-size:10px;color:#73726C;text-transform:uppercase;margin:4px 0 0;">Éditorial</p></div>
      </div>` : ''}
    </div>

    <!-- Tech detection -->
    <div style="background:#FFFFFF;border:1px solid #EEEDEB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="font-size:11px;color:#73726C;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 12px;">Ce qu'on a détecté</p>
      <p style="font-size:13px;color:#1A1A18;margin:0 0 6px;">✅ ${crawlResult.totalUrlsCrawled} pages analysées</p>
      ${cms ? `<p style="font-size:13px;color:#1A1A18;margin:0 0 6px;">🛠️ CMS : ${cms.name}</p>` : ''}
      <p style="font-size:13px;color:#1A1A18;margin:0 0 6px;">${crawlResult.isHttps ? '🔒' : '🔓'} HTTPS : ${crawlResult.isHttps ? 'actif' : 'inactif'}</p>
      <p style="font-size:13px;color:#1A1A18;margin:0;">⚡ Temps de réponse : ${(crawlResult.homepageResponseTimeMs / 1000).toFixed(1)}s</p>
    </div>

    <!-- Top issues -->
    <div style="background:#FFFFFF;border:1px solid #EEEDEB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="font-size:11px;color:#73726C;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 12px;">Points critiques</p>
      <ul style="padding-left:16px;margin:0;">${topIssues}</ul>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${reportUrl}" style="display:inline-block;padding:12px 32px;background:#1A1A18;color:#FFFFFF;font-size:13px;font-weight:500;text-decoration:none;border-radius:8px;">Voir le rapport complet</a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:24px;border-top:1px solid #EEEDEB;">
      <p style="font-size:11px;color:#C2C0B6;margin:0;">Mamie SEO — Analyse SEO pour indépendants</p>
      <p style="font-size:10px;color:#C2C0B6;margin:4px 0 0;">Ce rapport est disponible pendant 24h.</p>
    </div>

  </div>
</body>
</html>`;
}

export async function sendReportEmail(
  email: string,
  report: Report,
  reportUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!BREVO_API_KEY) {
    return { success: false, error: 'Clé API Brevo non configurée.' };
  }

  const htmlContent = buildReportEmailHtml(report, reportUrl);

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: 'Mamie SEO',
          email: BREVO_SENDER_EMAIL,
        },
        to: [{ email }],
        subject: `Votre rapport SEO — ${report.url}`,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      console.error('Brevo error:', data);
      return { success: false, error: data.message || 'Erreur Brevo' };
    }

    return { success: true };
  } catch (err) {
    console.error('Brevo send error:', err);
    return { success: false, error: 'Erreur de connexion à Brevo.' };
  }
}
