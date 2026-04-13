import type { Report } from './types';

function getScoreColor(score: number): string {
  if (score < 40) return '#E05252';
  if (score < 65) return '#F27A2A';
  if (score < 85) return '#F0C744';
  return '#22A168';
}

export function buildOutreachEmailHtml(report: Report, reportUrl: string, unsubscribeUrl: string): string {
  const { technicalScore, editorialAnalysis } = report;
  const editorialScore = editorialAnalysis?.score_editorial ?? 0;
  const combinedScore = editorialAnalysis
    ? Math.round((technicalScore.total + editorialScore) / 2)
    : technicalScore.total;
  const scoreColor = getScoreColor(combinedScore);

  let domain = report.url;
  try { domain = new URL(report.url).hostname; } catch {}

  // --- Personalization from editorial analysis ---
  const activiteResume = editorialAnalysis?.comprehension_activite?.resume || '';
  const ctaSuggestion = editorialAnalysis?.call_to_action?.point_amelioration || '';
  const confianceSuggestion = editorialAnalysis?.signaux_confiance?.point_amelioration || '';
  const offresSuggestion = editorialAnalysis?.coherence_offres?.point_amelioration || '';
  const tonaleSuggestion = editorialAnalysis?.coherence_tonale?.point_amelioration || '';

  // Pick the 2 best UX/non-technical suggestions (CTA & trust first)
  const uxSuggestions: string[] = [];
  if (ctaSuggestion) uxSuggestions.push(ctaSuggestion);
  if (confianceSuggestion) uxSuggestions.push(confianceSuggestion);
  if (uxSuggestions.length < 2 && offresSuggestion) uxSuggestions.push(offresSuggestion);
  if (uxSuggestions.length < 2 && tonaleSuggestion) uxSuggestions.push(tonaleSuggestion);

  // Fallback if no editorial data
  if (uxSuggestions.length === 0) {
    const topIssues = [...technicalScore.criteria]
      .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)
      .slice(0, 2);
    topIssues.forEach(issue => uxSuggestions.push(issue.details));
  }

  const suggestionsHtml = uxSuggestions.slice(0, 2).map(s =>
    `<li style="margin-bottom:12px;font-size:14px;color:#5C534B;line-height:1.7;">${s}</li>`
  ).join('');

  // Context paragraph — reference their activity naturally
  const contextParagraph = activiteResume
    ? `<p style="font-size:15px;color:#5C534B;line-height:1.8;margin:0 0 18px;">J'ai pris le temps de parcourir <strong style="color:#3D3530;">${domain}</strong> en détail. ${activiteResume}</p>`
    : `<p style="font-size:15px;color:#5C534B;line-height:1.8;margin:0 0 18px;">J'ai pris le temps de parcourir <strong style="color:#3D3530;">${domain}</strong> en détail.</p>`;

  const expirationDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:'Georgia',serif;">
  <div style="max-width:580px;margin:0 auto;padding:44px 28px;">

    <div style="margin-bottom:28px;">
      <p style="font-size:15px;color:#3D3530;line-height:1.8;margin:0 0 18px;">Bonjour,</p>
      ${contextParagraph}
      <p style="font-size:15px;color:#5C534B;line-height:1.8;margin:0;">
        En le parcourant, deux choses m'ont sauté aux yeux qui pourraient vraiment aider à convertir davantage de visiteurs en clients&nbsp;:
      </p>
    </div>

    <div style="background:#FFFFFF;border-left:3px solid #C8A87C;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:28px;">
      <ul style="padding-left:16px;margin:0;">
        ${suggestionsHtml}
      </ul>
    </div>

    <p style="font-size:15px;color:#5C534B;line-height:1.8;margin:0 0 28px;">
      Ce ne sont que les points les plus visibles. J'ai compilé une analyse complète de votre site
      — votre score actuel est de <strong style="color:${scoreColor};">${combinedScore}/100</strong>.
      Elle couvre la structure, le contenu, les mots-clés et inclut un plan d'action priorisé.
    </p>

    <!--[if mso]><table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center"><tr><td style="padding-right:8px;"><![endif]-->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${reportUrl}" style="display:inline-block;padding:13px 28px;background:#3D3530;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;margin:0 6px 10px;">Voir mon rapport</a>
      <a href="mailto:contact@maxence-cailleau.fr?subject=Re%20:%20analyse%20de%20${encodeURIComponent(domain)}" style="display:inline-block;padding:13px 28px;background:transparent;color:#3D3530;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;border:1.5px solid #C8A87C;margin:0 6px 10px;">Me contacter</a>
      <p style="font-size:12px;color:#B8AFA6;margin:14px 0 0;">Rapport disponible jusqu'au ${expirationDate}.</p>
    </div>
    <!--[if mso]></td></tr></table><![endif]-->

    <div style="border-top:1px solid #E8E2DA;margin:28px 0;"></div>

    <div style="margin-bottom:24px;">
      <p style="font-size:15px;color:#3D3530;margin:0 0 6px;">Bonne journ&eacute;e,</p>
      <p style="font-size:15px;font-weight:700;color:#3D3530;margin:0 0 2px;">Maxence Cailleau</p>
      <p style="font-size:13px;color:#8A7F75;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Designer & D&eacute;veloppeur de sites web</p>
    </div>

    <div style="border-top:1px solid #E8E2DA;padding-top:14px;text-align:center;">
      <p style="font-size:10px;color:#C5BDB4;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <a href="${unsubscribeUrl}" style="color:#C5BDB4;text-decoration:underline;">Se d&eacute;sabonner</a>
      </p>
    </div>

  </div>
</body>
</html>`;
}

export function getOutreachSubject(domain: string): string {
  return `Quelques idées pour ${domain}`;
}

export async function sendOutreachEmail(
  email: string,
  report: Report,
  reportId: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mamie-seo.fr';

  if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
    return { success: false, error: `Config Brevo manquante (key: ${!!BREVO_API_KEY}, sender: ${!!BREVO_SENDER_EMAIL})` };
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
          email: 'contact@maxence-cailleau.fr',
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
