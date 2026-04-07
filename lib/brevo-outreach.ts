import type { Report } from './types';

const BREVO_API_KEY = process.env.BREVO_API_KEY!;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mamie-seo.fr';

function getScoreVerdict(score: number): string {
  if (score < 40) return 'Votre site présente plusieurs lacunes importantes qui limitent fortement votre visibilité.';
  if (score < 65) return 'Votre site a des bases solides, mais des points critiques freinent votre visibilité.';
  if (score < 80) return 'Votre site est bien structuré, quelques optimisations peuvent encore améliorer vos résultats.';
  return 'Votre site est bien optimisé — quelques ajustements peuvent le rendre encore plus performant.';
}

function getScoreColor(score: number): string {
  if (score < 40) return '#E05252';
  if (score < 65) return '#F27A2A';
  if (score < 85) return '#F0C744';
  return '#22A168';
}

function getProgressBarHtml(score: number, color: string): string {
  return `
    <div style="background:#f0f0f0;border-radius:4px;height:8px;width:100%;max-width:300px;margin:12px auto;">
      <div style="background:${color};border-radius:4px;height:8px;width:${score}%;"></div>
    </div>`;
}

export function buildOutreachEmailHtml(report: Report, reportUrl: string, unsubscribeUrl: string): string {
  const { technicalScore, editorialAnalysis, crawlResult } = report;
  const editorialScore = editorialAnalysis?.score_editorial ?? 0;
  const combinedScore = editorialAnalysis
    ? Math.round((technicalScore.total + editorialScore) / 2)
    : technicalScore.total;
  const scoreColor = getScoreColor(combinedScore);
  const verdict = getScoreVerdict(combinedScore);

  let domain = report.url;
  try { domain = new URL(report.url).hostname; } catch {}

  // Top 3 issues
  const topIssues = [...technicalScore.criteria]
    .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)
    .slice(0, 3);

  const issuesHtml = topIssues.map((issue) => {
    const pct = Math.round((issue.score / issue.maxScore) * 100);
    const color = getScoreColor(pct);
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:500;color:#1A1A18;">⚠️ ${issue.name}</p>
          <p style="margin:0;font-size:13px;color:#73726C;line-height:1.4;">${issue.details}</p>
          <p style="margin:4px 0 0;font-size:12px;color:${color};font-weight:500;">${issue.score}/${issue.maxScore}</p>
        </td>
      </tr>`;
  }).join('');

  const otherCount = technicalScore.criteria.length - 3;
  const expirationDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8F8F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:18px;font-weight:500;color:#1A1A18;margin:0 0 4px;">Mamie SEO</h1>
      <p style="font-size:12px;color:#C2C0B6;margin:0;text-transform:uppercase;letter-spacing:0.07em;">Analyse SEO & Copywriting</p>
    </div>

    <div style="border-top:1px solid #EEEDEB;margin-bottom:24px;"></div>

    <!-- Intro text -->
    <div style="margin-bottom:24px;">
      <p style="font-size:14px;color:#1A1A18;line-height:1.6;margin:0 0 12px;">Bonjour,</p>
      <p style="font-size:14px;color:#73726C;line-height:1.6;margin:0;">
        En parcourant votre site, j'ai lancé une analyse SEO et copywriting automatisée.<br>
        Voici ce qu'elle a révélé en 60 secondes.
      </p>
    </div>

    <div style="border-top:1px solid #EEEDEB;margin-bottom:24px;"></div>

    <!-- Score card -->
    <div style="background:#FFFFFF;border:1px solid #EEEDEB;border-radius:12px;padding:32px;text-align:center;margin-bottom:24px;">
      <p style="font-size:11px;color:#73726C;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 12px;">Score global</p>
      <p style="font-size:48px;font-weight:500;color:${scoreColor};margin:0;">${combinedScore}</p>
      <p style="font-size:12px;color:#73726C;margin:4px 0 0;">/100</p>
      ${getProgressBarHtml(combinedScore, scoreColor)}
      <p style="font-size:13px;color:#73726C;margin:16px 0 0;line-height:1.5;font-style:italic;">"${verdict}"</p>
    </div>

    <div style="border-top:1px solid #EEEDEB;margin-bottom:24px;"></div>

    <!-- Top issues -->
    <div style="background:#FFFFFF;border:1px solid #EEEDEB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="font-size:11px;color:#73726C;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 12px;">Points critiques détectés</p>
      <table style="width:100%;border-collapse:collapse;">${issuesHtml}</table>
    </div>

    <div style="border-top:1px solid #EEEDEB;margin-bottom:24px;"></div>

    <!-- More points -->
    <div style="text-align:center;margin-bottom:24px;">
      <p style="font-size:13px;color:#73726C;line-height:1.6;margin:0;">
        + ${otherCount > 0 ? otherCount : ''} autres points analysés dans le rapport complet<br>
        <span style="font-size:12px;">(mots-clés manquants, maillage interne, analyse éditoriale, plan d'action priorisé).</span>
      </p>
    </div>

    <div style="border-top:1px solid #EEEDEB;margin-bottom:24px;"></div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${reportUrl}" style="display:inline-block;padding:14px 36px;background:#1A1A18;color:#FFFFFF;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;">Voir mon rapport complet →</a>
      <p style="font-size:12px;color:#C2C0B6;margin:12px 0 0;">Ce rapport est disponible jusqu'au ${expirationDate}.</p>
    </div>

    <div style="border-top:1px solid #EEEDEB;margin-bottom:24px;"></div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:16px;">
      <p style="font-size:13px;color:#1A1A18;margin:0 0 4px;">Bonne journée,</p>
      <p style="font-size:13px;font-weight:500;color:#1A1A18;margin:0 0 4px;">Maxence Cailleau</p>
      <p style="font-size:12px;color:#73726C;margin:0;">Consultant SEO & Web pour indépendants</p>
    </div>

    <div style="border-top:1px solid #EEEDEB;margin:24px 0;"></div>

    <!-- Legal footer -->
    <div style="text-align:center;">
      <p style="font-size:10px;color:#C2C0B6;margin:0;">
        Vous recevez cet email car votre adresse est publique sur votre site.
        <a href="${unsubscribeUrl}" style="color:#C2C0B6;text-decoration:underline;">Se désabonner</a>
      </p>
    </div>

  </div>
</body>
</html>`;
}

export function getOutreachSubject(domain: string): string {
  return `J'ai analysé ${domain} — voici ce que j'ai trouvé`;
}

export async function sendOutreachEmail(
  email: string,
  report: Report,
  reportId: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!BREVO_API_KEY) {
    return { success: false, error: 'Clé API Brevo non configurée.' };
  }

  let domain = report.url;
  try { domain = new URL(report.url).hostname; } catch {}

  const reportUrl = `${APP_URL}/report/${reportId}`;
  const unsubscribeUrl = `${APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&report=${reportId}`;

  const htmlContent = buildOutreachEmailHtml(report, reportUrl, unsubscribeUrl);

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
          name: 'Maxence Cailleau',
          email: BREVO_SENDER_EMAIL,
        },
        replyTo: {
          email: 'maxence.cailleau1@gmail.com',
          name: 'Maxence Cailleau',
        },
        to: [{ email }],
        subject: getOutreachSubject(domain),
        htmlContent,
        headers: {
          'X-Mailin-Tag': 'outreach',
        },
        params: {
          REPORT_ID: reportId,
        },
        // Enable open and click tracking
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      console.error('Brevo outreach error:', data);
      return { success: false, error: data.message || 'Erreur Brevo' };
    }

    const data = await res.json();
    return { success: true, messageId: data.messageId };
  } catch (err) {
    console.error('Brevo outreach send error:', err);
    return { success: false, error: 'Erreur de connexion à Brevo.' };
  }
}
