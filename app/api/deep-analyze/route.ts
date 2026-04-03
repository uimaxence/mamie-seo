import { NextRequest } from 'next/server';
import { getReport } from '@/lib/store';
import { getPersistedReport } from '@/lib/report-store';
import { getCredits, deductCredit, addCredits } from '@/lib/credits';
import { analyzePageDeep } from '@/lib/deep-analysis';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  let body: { reportId: string; email: string; pageUrl: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const { reportId, email, pageUrl } = body;

  if (!reportId || !email || !pageUrl) {
    return Response.json({ error: 'Paramètres manquants.' }, { status: 400 });
  }

  // Validate URL
  try {
    const parsed = new URL(pageUrl);
    if (!parsed.protocol.startsWith('http')) throw new Error();
    if (['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'].includes(parsed.hostname)) throw new Error();
  } catch {
    return Response.json({ error: 'URL invalide.' }, { status: 400 });
  }

  // Check credits
  const credits = await getCredits(email);
  if (credits <= 0) {
    return Response.json(
      { error: 'Aucun crédit disponible. Achetez des crédits pour analyser une page.', needsPayment: true },
      { status: 402 }
    );
  }

  // Get report for context
  let report = getReport(reportId);
  if (!report) {
    report = await getPersistedReport(reportId);
  }
  if (!report) {
    return Response.json({ error: 'Rapport introuvable ou expiré.' }, { status: 404 });
  }

  // Deduct credit before analysis
  const deducted = await deductCredit(email);
  if (!deducted) {
    return Response.json({ error: 'Erreur lors de la déduction du crédit.' }, { status: 500 });
  }

  try {
    const result = await analyzePageDeep(pageUrl, report.crawlResult, report.onboarding);

    return Response.json({
      analysis: result.analysis,
      desktopScreenshot: result.desktopScreenshot,
      mobileScreenshot: result.mobileScreenshot,
      desktopWidth: result.desktopWidth,
      desktopHeight: result.desktopHeight,
      remainingCredits: credits - 1,
    });
  } catch (err) {
    // Refund on error
    await addCredits(email, 1);
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return Response.json({ error: message }, { status: 500 });
  }
}
