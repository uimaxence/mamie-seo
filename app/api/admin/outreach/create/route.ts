import { NextRequest } from 'next/server';
import { isAdminEmail, createOutreachRecord, checkExistingOutreach } from '@/lib/admin';
import { crawlSite } from '@/lib/crawler';
import { calculateTechnicalScore } from '@/lib/scorer';
import { analyzeWithClaude } from '@/lib/claude';
import { persistReport } from '@/lib/report-store';
import { saveReport } from '@/lib/store';
import { sendOutreachEmail } from '@/lib/brevo-outreach';
import { getSupabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { Report, OnboardingAnswers, ProgressEvent } from '@/lib/types';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const adminEmail = request.headers.get('x-user-email');
  if (!adminEmail || !isAdminEmail(adminEmail)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { email: string; url: string; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const { email, url, force } = body;

  if (!email || !url) {
    return Response.json({ error: 'Email et URL requis.' }, { status: 400 });
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Format email invalide.' }, { status: 400 });
  }

  // Validate URL
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('http')) throw new Error();
  } catch {
    return Response.json({ error: "L'URL n'est pas valide." }, { status: 400 });
  }

  // Check for existing outreach
  if (!force) {
    const existing = await checkExistingOutreach(email);
    if (existing) {
      const sentDate = existing.sent_at
        ? new Date(existing.sent_at).toLocaleDateString('fr-FR')
        : 'date inconnue';
      return Response.json({
        error: `Un rapport a déjà été envoyé à cet email le ${sentDate}.`,
        existingId: existing.id,
        canForce: true,
      }, { status: 409 });
    }
  }

  // SSE stream for real-time progress
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (event: ProgressEvent) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch { /* client disconnected */ }
  };

  (async () => {
    try {
      // Step 1: Validate URL
      await sendEvent({ step: 'connecting', message: 'URL validée' });

      // Step 2: Crawl
      await sendEvent({ step: 'connecting', message: 'Analyse lancée' });
      const crawlResult = await crawlSite(url, async (step, detail, progress) => {
        await sendEvent({ step: step as ProgressEvent['step'], message: detail || step, progress });
      });

      // Step 3: Score
      await sendEvent({ step: 'scoring', message: 'Calcul des scores...' });
      const technicalScore = calculateTechnicalScore(crawlResult);

      // Step 4: Claude editorial analysis
      await sendEvent({ step: 'editorial', message: 'Analyse éditoriale en cours...' });
      const defaultOnboarding: OnboardingAnswers = {
        metier: 'autre',
        objectif: 'leads',
        audience: 'particuliers',
        niveauSEO: 'jamais',
        anciennete: '6_mois_2_ans',
      };

      let editorialAnalysis = null;
      try {
        editorialAnalysis = await analyzeWithClaude(crawlResult, defaultOnboarding, technicalScore);
      } catch (err) {
        console.error('Editorial analysis error:', err);
        await sendEvent({ step: 'editorial', message: 'Analyse éditoriale partielle' });
      }

      // Step 5: Generate report
      await sendEvent({ step: 'generating', message: 'Génération du rapport...' });
      const report: Report = {
        id: uuidv4(),
        url: crawlResult.finalUrl,
        createdAt: new Date().toISOString(),
        crawlResult,
        technicalScore,
        editorialAnalysis,
        onboarding: defaultOnboarding,
      };

      // Save report
      saveReport(report);
      await persistReport(report, undefined, email);

      // Set expiry on report (14 days)
      const supabase = getSupabase();
      await supabase
        .from('reports')
        .update({
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          email_sent_to: email,
        })
        .eq('id', report.id);

      // Step 6: Send email
      await sendEvent({ step: 'generating', message: "Préparation de l'email..." });
      const brevoResult = await sendOutreachEmail(email, report, report.id);

      if (!brevoResult.success) {
        await sendEvent({ step: 'error', message: `Erreur Brevo: ${brevoResult.error}` });
        await writer.close();
        return;
      }

      await sendEvent({ step: 'generating', message: 'Envoi via Brevo...' });

      // Step 7: Record outreach
      let domain = report.url;
      try { domain = new URL(report.url).hostname; } catch {}

      const outreach = await createOutreachRecord({
        reportId: report.id,
        email: email.toLowerCase().trim(),
        domain,
        brevoMessageId: brevoResult.messageId,
      });

      // Compute combined score
      const editorialScore = editorialAnalysis?.score_editorial ?? 0;
      const combinedScore = editorialAnalysis
        ? Math.round((technicalScore.total + editorialScore) / 2)
        : technicalScore.total;

      await sendEvent({
        step: 'done',
        message: JSON.stringify({
          outreachId: outreach?.id,
          reportId: report.id,
          score: combinedScore,
          pagesCrawled: crawlResult.totalUrlsCrawled,
        }),
        detail: 'Rapport envoyé !',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      await sendEvent({ step: 'error', message });
    } finally {
      try { await writer.close(); } catch {}
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
