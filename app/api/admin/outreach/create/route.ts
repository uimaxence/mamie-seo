import { NextRequest } from 'next/server';
import { isAdminEmail, createOutreachRecord, checkExistingOutreach } from '@/lib/admin';
import { crawlSite } from '@/lib/crawler';
import { calculateTechnicalScore } from '@/lib/scorer';
import { analyzeWithClaude } from '@/lib/claude';
import { persistReport } from '@/lib/report-store';
import { saveReport } from '@/lib/store';
import { sendOutreachEmail, buildLinkedInMessage } from '@/lib/brevo-outreach';
import { analyzeScreenshotForOutreach } from '@/lib/deep-analysis';
import { getSupabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { Report, OnboardingAnswers, ProgressEvent } from '@/lib/types';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const adminEmail = request.headers.get('x-user-email');
  if (!adminEmail || !isAdminEmail(adminEmail)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { email?: string; url: string; force?: boolean; mode?: 'email' | 'linkedin' };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const { email, url, force, mode = 'email' } = body;

  // Email required for email mode
  if (mode === 'email' && !email) {
    return Response.json({ error: 'Email requis pour le mode email.' }, { status: 400 });
  }

  if (!url) {
    return Response.json({ error: 'URL requise.' }, { status: 400 });
  }

  // Validate email format (only if provided)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Format email invalide.' }, { status: 400 });
  }

  // Validate URL
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('http')) throw new Error();
  } catch {
    return Response.json({ error: "L'URL n'est pas valide." }, { status: 400 });
  }

  // Check for existing outreach (only for email mode with email)
  if (mode === 'email' && email && !force) {
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
        objectif: 'local',
        audience: 'particuliers',
        niveauSEO: 'jamais',
        anciennete: 'plus_2_ans',
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
      await persistReport(report, undefined, email || undefined);

      // Set expiry on report (14 days)
      const supabase = getSupabase();
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mamie-seo.fr';
      const reportUrl = `${APP_URL}/report/${report.id}`;

      await supabase
        .from('reports')
        .update({
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          ...(email ? { email_sent_to: email } : {}),
        })
        .eq('id', report.id);

      // Compute combined score
      const editorialScoreVal = editorialAnalysis?.score_editorial ?? 0;
      const combinedScore = editorialAnalysis
        ? Math.round((technicalScore.total + editorialScoreVal) / 2)
        : technicalScore.total;

      let domain = report.url;
      try { domain = new URL(report.url).hostname; } catch {}

      // Screenshot + visual analysis (shared by both modes)
      await sendEvent({ step: 'visual_analysis', message: 'Capture du site et analyse visuelle...' });

      let visualInsights: Awaited<ReturnType<typeof analyzeScreenshotForOutreach>> = null;
      try {
        visualInsights = await analyzeScreenshotForOutreach(report.url);
      } catch (err) {
        console.error('Visual analysis error (non-blocking):', err);
      }

      if (mode === 'linkedin') {
        // LinkedIn mode — generate message
        await sendEvent({ step: 'generating', message: 'Génération du message LinkedIn...' });

        const linkedinMessage = buildLinkedInMessage(report, reportUrl, visualInsights);

        const outreach = await createOutreachRecord({
          reportId: report.id,
          email: email || `linkedin:${domain}`,
          domain,
        });

        await sendEvent({
          step: 'done',
          message: JSON.stringify({
            outreachId: outreach?.id,
            reportId: report.id,
            score: combinedScore,
            pagesCrawled: crawlResult.totalUrlsCrawled,
            reportUrl,
            linkedinMessage,
          }),
          detail: 'Rapport prêt !',
        });
      } else {
        // Email mode — send via Brevo
        await sendEvent({ step: 'generating', message: "Préparation de l'email..." });
        const brevoResult = await sendOutreachEmail(email!, report, report.id, visualInsights);

        if (!brevoResult.success) {
          await sendEvent({ step: 'error', message: `Erreur Brevo: ${brevoResult.error}` });
          await writer.close();
          return;
        }

        await sendEvent({ step: 'generating', message: 'Envoi via Brevo...' });

        const outreach = await createOutreachRecord({
          reportId: report.id,
          email: email!.toLowerCase().trim(),
          domain,
          brevoMessageId: brevoResult.messageId,
        });

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
      }
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
