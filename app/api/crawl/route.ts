import { NextRequest } from 'next/server';
import { crawlSite } from '@/lib/crawler';
import { calculateTechnicalScore } from '@/lib/scorer';
import { analyzeWithClaude } from '@/lib/claude';
import { saveReport } from '@/lib/store';
import { hasAlreadyAnalyzed, recordAnalysis, saveEmail } from '@/lib/supabase';
import { sendReportEmail } from '@/lib/brevo';
import { persistReport } from '@/lib/report-store';
import { v4 as uuidv4 } from 'uuid';
import type { OnboardingAnswers, Report, ProgressEvent } from '@/lib/types';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  let body: { url: string; email?: string; onboarding?: OnboardingAnswers };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const { url } = body;
  // Email is optional — use placeholder for anonymous analyses
  const email = body.email?.trim().toLowerCase() || `anon_${ip.replace(/[.:]/g, '_')}@mamie-seo.local`;
  // Onboarding is optional — use sensible defaults
  const onboarding: OnboardingAnswers = body.onboarding || {
    metier: 'autre',
    objectif: 'leads',
    audience: 'particuliers',
    niveauSEO: 'jamais',
    anciennete: '6_mois_2_ans',
  };

  if (!url) {
    return Response.json({ error: 'URL requise.' }, { status: 400 });
  }

  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('http')) throw new Error();
  } catch {
    return Response.json({ error: "L'URL fournie n'est pas valide." }, { status: 400 });
  }

  // ═══ Return the SSE stream IMMEDIATELY — do all work inside the stream ═══
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (event: ProgressEvent) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch { /* client disconnected */ }
  };

  // Start async work AFTER returning the response
  (async () => {
    try {
      // Step 0: Rate limit check (inside the stream, not blocking the response)
      const rateCheck = await hasAlreadyAnalyzed(email, ip);
      if (rateCheck.limited) {
        await sendEvent({ step: 'error', message: rateCheck.reason || 'Limite atteinte.' });
        await writer.close();
        return;
      }

      if (rateCheck.luckyDay) {
        await sendEvent({
          step: 'connecting',
          message: "C'est votre jour de chance ! Vous avez droit à une seconde analyse gratuite.",
          detail: 'lucky_day',
        });
      }

      // Step 1-5: Crawl
      const crawlResult = await crawlSite(url, async (step, detail, progress) => {
        await sendEvent({ step: step as ProgressEvent['step'], message: detail || step, progress });
      });

      // Step 6: Score
      await sendEvent({ step: 'scoring', message: 'Calcul du score technique...' });
      const technicalScore = calculateTechnicalScore(crawlResult);

      // Step 7: Claude editorial analysis
      await sendEvent({ step: 'editorial', message: "Analyse éditoriale en cours — Claude lit chaque page de votre site..." });
      let editorialAnalysis = null;
      try {
        editorialAnalysis = await analyzeWithClaude(crawlResult, onboarding, technicalScore);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de l'analyse éditoriale";
        await sendEvent({ step: 'editorial', message: `Analyse éditoriale partielle : ${message}` });
      }

      // Step 8: Generate report
      await sendEvent({ step: 'generating', message: 'Génération du rapport...' });
      const report: Report = {
        id: uuidv4(),
        url: crawlResult.finalUrl,
        createdAt: new Date().toISOString(),
        crawlResult,
        technicalScore,
        editorialAnalysis,
        onboarding,
      };

      // Save report in memory + persist in Supabase
      // CRITICAL: persist must complete before "done" — on serverless,
      // the next request may hit a different instance with empty in-memory cache
      saveReport(report);
      try {
        await persistReport(report, undefined, email);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[crawl] persistReport failed:', message);
        await sendEvent({
          step: 'error',
          message: `Sauvegarde du rapport impossible : ${message}`,
        });
        await writer.close();
        return;
      }

      // Record analysis in Supabase (non-blocking)
      recordAnalysis({ email, ip, url: crawlResult.finalUrl, reportId: report.id }).catch(console.error);
      saveEmail(email, report.id).catch(console.error);

      // Send report email via Brevo (non-blocking)
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const reportUrl = `${protocol}://${host}/report/${report.id}`;
      sendReportEmail(email, report, reportUrl).catch(console.error);

      await sendEvent({
        step: 'done',
        message: report.id,
        detail: 'Analyse terminée !',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      await sendEvent({ step: 'error', message });
    } finally {
      try { await writer.close(); } catch { /* already closed */ }
    }
  })();

  // Return the stream response IMMEDIATELY — no await before this
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
