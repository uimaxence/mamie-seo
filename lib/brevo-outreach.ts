import type { Report } from './types';
import type { OutreachVisualInsights } from './deep-analysis';

function getScoreColor(score: number): string {
  if (score < 40) return '#E05252';
  if (score < 65) return '#F27A2A';
  if (score < 85) return '#F0C744';
  return '#22A168';
}

function getScoreLabel(score: number): string {
  if (score < 40) return 'Critique';
  if (score < 65) return 'À améliorer';
  if (score < 85) return 'Correct';
  return 'Bon';
}

function getPainMessage(score: number): string {
  if (score < 40) return "Aujourd'hui, la majorit&eacute; des gens qui cherchent vos services en ligne ne vous trouvent pas. Et ceux qui tombent sur votre site repartent sans vous contacter &mdash; pas parce que vous n'&ecirc;tes pas comp&eacute;tent, mais parce que votre site ne le montre pas assez vite.";
  if (score < 65) return "Chaque jour, des visiteurs int&eacute;ress&eacute;s par vos services arrivent sur votre site et repartent sans vous contacter. Pas parce que votre offre ne les int&eacute;resse pas &mdash; mais parce que votre site ne les convainc pas assez vite de passer &agrave; l'action.";
  if (score < 85) return "Votre site tourne, mais il laisse passer des opportunit&eacute;s. Des visiteurs qui cherchent exactement ce que vous proposez repartent sans vous contacter &mdash; quelques ajustements pourraient changer &ccedil;a.";
  return "Votre site est d&eacute;j&agrave; bien construit. Mais quelques d&eacute;tails vous s&eacute;parent d'un site qui convertit vraiment &mdash; celui o&ugrave; chaque visiteur comprend imm&eacute;diatement pourquoi vous contacter.";
}

/** Replace jargon terms with plain-language definitions for non-technical audience */
function dejargon(text: string): string {
  return text
    .replace(/\bCTA\b/g, 'bouton d\'action (le bouton qui incite vos visiteurs &agrave; vous contacter)')
    .replace(/\bcta\b/g, 'bouton d\'action (le bouton qui incite vos visiteurs &agrave; vous contacter)')
    .replace(/\bcall[- ]to[- ]action\b/gi, 'bouton d\'action (le bouton qui incite vos visiteurs &agrave; vous contacter)')
    .replace(/\bmaillage interne\b/gi, 'liens entre vos pages (pour guider les visiteurs)')
    .replace(/\bm&eacute;ta[- ]descriptions?\b/gi, 'texte de pr&eacute;sentation Google (le petit r&eacute;sum&eacute; sous le lien dans les r&eacute;sultats)')
    .replace(/\bmeta[- ]descriptions?\b/gi, 'texte de pr&eacute;sentation Google (le petit r&eacute;sum&eacute; sous le lien dans les r&eacute;sultats)')
    .replace(/\bbalises? H1\b/gi, 'titre principal de votre page')
    .replace(/\bH1\b/g, 'titre principal')
    .replace(/\bbalises? alt\b/gi, 'descriptions d\'images (pour Google et l\'accessibilit&eacute;)')
    .replace(/\btaux de rebond\b/gi, 'taux de visiteurs qui quittent votre site imm&eacute;diatement')
    .replace(/\bSEO\b/g, 'r&eacute;f&eacute;rencement (visibilit&eacute; sur Google)')
    .replace(/\bUX\b/g, 'exp&eacute;rience utilisateur (facilit&eacute; de navigation)')
    .replace(/\bresponsive\b/gi, 'adapt&eacute; au mobile');
}

export function buildOutreachEmailHtml(
  report: Report,
  reportUrl: string,
  unsubscribeUrl: string,
  visualInsights?: OutreachVisualInsights | null,
): string {
  const { technicalScore, editorialAnalysis, crawlResult } = report;
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

  // Build suggestions: mix visual insight + SEO/editorial insight
  const suggestions: string[] = [];

  // Visual observation first (shows "I actually looked at your site")
  if (visualInsights?.probleme_principal) {
    suggestions.push(visualInsights.probleme_principal);
  }
  if (visualInsights?.suggestion_concrete && suggestions.length < 2) {
    suggestions.push(visualInsights.suggestion_concrete);
  }

  // Fill remaining slots with best editorial/SEO insights
  const editorialSuggestions = [ctaSuggestion, confianceSuggestion, offresSuggestion, tonaleSuggestion]
    .filter(Boolean);
  for (const s of editorialSuggestions) {
    if (suggestions.length >= 2) break;
    suggestions.push(s);
  }

  // Final fallback: technical criteria
  if (suggestions.length === 0) {
    const topIssues = [...technicalScore.criteria]
      .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)
      .slice(0, 2);
    topIssues.forEach(issue => suggestions.push(issue.details));
  }

  // Bullet-point list with dejargoned text
  const suggestionsHtml = suggestions.slice(0, 2).map(s =>
    `<li style="margin-bottom:10px;color:#1A1A18;font-size:16px;line-height:1.6;">${dejargon(s)}</li>`
  ).join('');

  // Dynamic personalization
  const painMessage = getPainMessage(combinedScore);
  const contextParagraph = activiteResume
    ? `<p style="font-size:16px;color:#73726C;line-height:1.6;margin:0 0 14px;">J'ai pris le temps de parcourir <strong style="color:#1A1A18;">${domain}</strong>. ${activiteResume}</p>`
    : `<p style="font-size:16px;color:#73726C;line-height:1.6;margin:0 0 14px;">J'ai pris le temps de parcourir <strong style="color:#1A1A18;">${domain}</strong>.</p>`;

  // Top 3 criteria for the report preview
  const topCriteria = [...technicalScore.criteria]
    .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)
    .slice(0, 3);

  const criteriaHtml = topCriteria.map((c, i) => {
    const pct = Math.round((c.score / c.maxScore) * 100);
    const color = getScoreColor(pct);
    const isLast = i === topCriteria.length - 1;
    return `<tr>
      <td style="padding:10px 0;${!isLast ? 'border-bottom:1px solid #EEEDEB;' : ''}">
        <table style="width:100%;"><tr>
          <td style="font-size:15px;color:#1A1A18;font-weight:500;">${c.name}</td>
          <td style="text-align:right;font-size:15px;font-weight:500;color:${color};">${c.score}/${c.maxScore}</td>
        </tr></table>
      </td>
    </tr>`;
  }).join('');

  const cms = crawlResult.technologies.find((t) => t.category === 'cms');

  const expirationDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F8F8F7;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;color:#1A1A18;">
  <div style="max-width:580px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <table style="width:100%;margin-bottom:32px;"><tr>
      <td>
        <p style="font-size:20px;font-weight:500;color:#1A1A18;margin:0;">Maxence Cailleau</p>
        <p style="font-size:14px;color:#73726C;margin:2px 0 0;">Designer & D&eacute;veloppeur de sites web</p>
      </td>
      <td style="text-align:right;vertical-align:top;">
        <p style="font-size:12px;color:#C2C0B6;text-transform:uppercase;letter-spacing:0.07em;margin:0;">Analyse de ${domain}</p>
      </td>
    </tr></table>

    <div style="border-top:1px solid #EEEDEB;margin-bottom:28px;"></div>

    <!-- Personal intro -->
    <div style="margin-bottom:24px;">
      <p style="font-size:16px;color:#1A1A18;line-height:1.6;margin:0 0 14px;">Bonjour,</p>
      ${contextParagraph}
      <p style="font-size:16px;color:#1A1A18;line-height:1.6;margin:0 0 14px;">
        ${painMessage}
      </p>
      <p style="font-size:16px;color:#1A1A18;line-height:1.6;margin:0;font-weight:500;">
        Voici concr&egrave;tement ce que j'ai relev&eacute;&nbsp;:
      </p>
    </div>

    <!-- Suggestions as bullet points -->
    <div style="background:#FFFFFF;border:1px solid #EEEDEB;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
      <ul style="padding-left:18px;margin:0;">
        ${suggestionsHtml}
      </ul>
    </div>

    <p style="font-size:16px;color:#73726C;line-height:1.6;margin:0 0 28px;">
      Ce ne sont que les points les plus visibles. J'ai compil&eacute; une analyse compl&egrave;te &mdash; votre score actuel est de <strong style="color:${scoreColor};">${combinedScore}/100</strong>. Il y a une vraie marge de progression, et les corrections prioritaires sont souvent rapides &agrave; mettre en place.
    </p>

    <!-- Score card -->
    <div style="background:#FFFFFF;border:1px solid #EEEDEB;border-radius:12px;padding:24px;margin-bottom:20px;">
      <table style="width:100%;"><tr>
        <td style="text-align:center;width:120px;vertical-align:top;padding-right:20px;border-right:1px solid #EEEDEB;">
          <p style="font-size:12px;color:#C2C0B6;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 8px;">Score global</p>
          <p style="font-size:36px;font-weight:500;color:${scoreColor};margin:0;line-height:1;">${combinedScore}</p>
          <p style="font-size:12px;color:#C2C0B6;margin:2px 0 0;">/100</p>
          <p style="font-size:11px;font-weight:500;color:${scoreColor};margin:8px 0 0;">${getScoreLabel(combinedScore)}</p>
        </td>
        <td style="vertical-align:top;padding-left:20px;">
          <p style="font-size:12px;color:#C2C0B6;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 10px;">Points critiques</p>
          <table style="width:100%;border-collapse:collapse;">
            ${criteriaHtml}
          </table>
        </td>
      </tr></table>
    </div>

    <!-- Tech info -->
    <div style="background:#FFFFFF;border:1px solid #EEEDEB;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
      <table style="width:100%;"><tr>
        <td style="font-size:13px;color:#73726C;">
          ${crawlResult.totalUrlsCrawled} pages analys&eacute;es${cms ? ` &middot; ${cms.name}` : ''} &middot; ${crawlResult.isHttps ? 'HTTPS' : 'HTTP'}
        </td>
        <td style="text-align:right;">
          ${editorialAnalysis ? `
          <span style="font-size:13px;color:#73726C;">Technique <strong style="color:#1A1A18;">${technicalScore.total}</strong></span>
          <span style="font-size:13px;color:#EEEDEB;margin:0 6px;">&middot;</span>
          <span style="font-size:13px;color:#73726C;">&Eacute;ditorial <strong style="color:#1A1A18;">${editorialScore}</strong></span>
          ` : `<span style="font-size:13px;color:#73726C;">Score technique <strong style="color:#1A1A18;">${technicalScore.total}/100</strong></span>`}
        </td>
      </tr></table>
    </div>

    <div style="border-top:1px solid #EEEDEB;margin-bottom:28px;"></div>

    <!-- Transition text -->
    <p style="font-size:16px;color:#1A1A18;line-height:1.6;margin:0 0 24px;text-align:center;">
      J'ai pr&eacute;par&eacute; un rapport complet avec un plan d'action prioris&eacute;<br>&mdash; les corrections les plus rentables en premier.
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:16px;">
      <a href="${reportUrl}" style="display:inline-block;padding:14px 32px;background:#1A1A18;color:#FFFFFF;font-family:'DM Sans',-apple-system,sans-serif;font-size:16px;font-weight:500;text-decoration:none;border-radius:8px;">Voir mon rapport</a>
      <p style="font-size:12px;color:#C2C0B6;margin:12px 0 0;">Disponible jusqu'au ${expirationDate}.</p>
    </div>

    <p style="font-size:16px;color:#73726C;line-height:1.6;margin:0 0 28px;text-align:center;">
      Une question ? R&eacute;pondez simplement &agrave; cet email.
    </p>

    <div style="border-top:1px solid #EEEDEB;margin-bottom:24px;"></div>

    <!-- Sign-off -->
    <div style="margin-bottom:20px;">
      <p style="font-size:16px;color:#1A1A18;margin:0 0 4px;">Bonne journ&eacute;e,</p>
      <p style="font-size:16px;font-weight:500;color:#1A1A18;margin:0;">Maxence</p>
    </div>

    <div style="border-top:1px solid #EEEDEB;padding-top:12px;text-align:center;">
      <p style="font-size:12px;color:#C2C0B6;margin:0;">
        <a href="${unsubscribeUrl}" style="color:#C2C0B6;text-decoration:underline;">Se d&eacute;sabonner</a>
      </p>
    </div>

  </div>
</body>
</html>`;
}

export function getOutreachSubject(domain: string): string {
  return `Quelques idées pour ${domain}`;
}

/** Build a short LinkedIn DM message from report data */
export function buildLinkedInMessage(
  report: Report,
  reportUrl: string,
  visualInsights?: OutreachVisualInsights | null,
): string {
  const { technicalScore, editorialAnalysis } = report;
  const editorialScore = editorialAnalysis?.score_editorial ?? 0;
  const combinedScore = editorialAnalysis
    ? Math.round((technicalScore.total + editorialScore) / 2)
    : technicalScore.total;

  let domain = report.url;
  try { domain = new URL(report.url).hostname; } catch {}

  const activiteResume = editorialAnalysis?.comprehension_activite?.resume || '';

  const intro = activiteResume
    ? `Je suis tombé sur ${domain} et j'ai pris le temps de regarder votre site. ${activiteResume}`
    : `Je suis tombé sur ${domain} et j'ai pris le temps de regarder votre site en détail.`;

  // Prefer visual insights (from screenshot) over editorial text suggestions
  let observationBlock = '';
  if (visualInsights) {
    const lines: string[] = [];
    if (visualInsights.verdict_visuel) {
      lines.push(visualInsights.verdict_visuel);
    }
    if (visualInsights.probleme_principal) {
      lines.push(visualInsights.probleme_principal);
    }
    if (visualInsights.suggestion_concrete) {
      lines.push(visualInsights.suggestion_concrete);
    }
    observationBlock = lines.join('\n\n');
  } else {
    // Fallback: editorial text suggestion (dejargoned)
    const topSuggestion =
      editorialAnalysis?.call_to_action?.point_amelioration ||
      editorialAnalysis?.signaux_confiance?.point_amelioration ||
      editorialAnalysis?.coherence_offres?.point_amelioration || '';

    const cleanSuggestion = topSuggestion
      .replace(/\bCTA\b/gi, 'bouton d\'action')
      .replace(/\bmaillage interne\b/gi, 'liens entre vos pages')
      .replace(/\bmeta[- ]descriptions?\b/gi, 'textes de présentation Google')
      .replace(/\bm[ée]ta[- ]descriptions?\b/gi, 'textes de présentation Google')
      .replace(/\bSEO\b/g, 'référencement');

    if (cleanSuggestion) {
      observationBlock = `J'ai relevé un point qui pourrait vous aider à obtenir plus de clients : ${cleanSuggestion}`;
    }
  }

  const observationSection = observationBlock ? `\n\n${observationBlock}` : '';

  return `Bonjour,

${intro}${observationSection}

J'ai compilé une analyse complète dans un rapport personnalisé (score actuel : ${combinedScore}/100) :
${reportUrl}

Si vous voulez que je vous l'envoie par email ou si vous avez des questions, n'hésitez pas !

Maxence Cailleau
Designer & développeur web`;
}

export async function sendOutreachEmail(
  email: string,
  report: Report,
  reportId: string,
  visualInsights?: OutreachVisualInsights | null,
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

  const htmlContent = buildOutreachEmailHtml(report, reportUrl, unsubscribeUrl, visualInsights);

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
