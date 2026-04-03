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

export const maxDuration = 120; // Allow up to 2 minutes

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  let body: { url: string; email: string; onboarding: OnboardingAnswers };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const { url, email, onboarding } = body;

  if (!url || !email || !onboarding) {
    return Response.json({ error: 'URL, email et réponses onboarding requis.' }, { status: 400 });
  }

  // Validate email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Adresse email invalide.' }, { status: 400 });
  }

  // Validate URL format
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('http')) throw new Error();
  } catch {
    return Response.json({ error: "L'URL fournie n'est pas valide." }, { status: 400 });
  }

  // Check rate limit: 2 free analyses max, then block
  const rateCheck = await hasAlreadyAnalyzed(email, ip);
  if (rateCheck.limited) {
    return Response.json(
      { error: rateCheck.reason, upgrade: true },
      { status: 429 }
    );
  }
  const isLuckyDay = rateCheck.luckyDay === true;

  // Use Server-Sent Events for progress
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (event: ProgressEvent) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  // Run the analysis in the background
  (async () => {
    try {
      // Send lucky day message if applicable
      if (isLuckyDay) {
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

      // Step 7: Claude editorial analysis (server-side API key)
      await sendEvent({ step: 'editorial', message: "Analyse éditoriale en cours — Claude lit chaque page de votre site..." });
      let editorialAnalysis = null;
      try {
        editorialAnalysis = await analyzeWithClaude(crawlResult, onboarding, technicalScore);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de l'analyse éditoriale";
        // Continue without editorial if Claude fails
        await sendEvent({
          step: 'editorial',
          message: `Analyse éditoriale partielle : ${message}`,
        });
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
      saveReport(report);
      persistReport(report, undefined, email).catch(console.error);

      // Record analysis in Supabase (rate limiting + lead capture)
      await recordAnalysis({ email, ip, url: crawlResult.finalUrl, reportId: report.id });
      await saveEmail(email, report.id);

      // Send report email via Brevo
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const reportUrl = `${protocol}://${host}/report/${report.id}`;
      sendReportEmail(email, report, reportUrl).catch(console.error); // fire and forget

      await sendEvent({
        step: 'done',
        message: report.id,
        detail: 'Analyse terminée !',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      await sendEvent({ step: 'error', message });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
