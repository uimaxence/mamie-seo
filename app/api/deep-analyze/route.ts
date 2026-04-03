import { NextRequest } from 'next/server';
import { getReport } from '@/lib/store';
import { getCredits, deductCredit } from '@/lib/credits';
import { analyzePageDeep } from '@/lib/deep-analysis';

export const maxDuration = 60;

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
    new URL(pageUrl);
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
  const report = getReport(reportId);
  if (!report) {
    return Response.json({ error: 'Rapport introuvable ou expiré.' }, { status: 404 });
  }

  // Deduct credit
  const deducted = await deductCredit(email);
  if (!deducted) {
    return Response.json({ error: 'Erreur lors de la déduction du crédit.' }, { status: 500 });
  }

  try {
    const analysis = await analyzePageDeep(pageUrl, report.crawlResult, report.onboarding);
    return Response.json({ analysis, remainingCredits: credits - 1 });
  } catch (err) {
    // Refund the credit on error
    const { addCredits } = await import('@/lib/credits');
    await addCredits(email, 1);
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return Response.json({ error: message }, { status: 500 });
  }
}
