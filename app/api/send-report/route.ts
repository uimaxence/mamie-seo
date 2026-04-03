import { NextRequest } from 'next/server';
import { getReport } from '@/lib/store';
import { sendReportEmail } from '@/lib/brevo';

export async function POST(request: NextRequest) {
  let body: { reportId: string; email: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const { reportId, email } = body;

  if (!reportId || !email) {
    return Response.json({ error: 'ID du rapport et email requis.' }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Adresse email invalide.' }, { status: 400 });
  }

  const report = getReport(reportId);
  if (!report) {
    return Response.json({ error: 'Rapport introuvable ou expiré.' }, { status: 404 });
  }

  // Build report URL
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const reportUrl = `${protocol}://${host}/report/${reportId}`;

  const result = await sendReportEmail(email, report, reportUrl);

  if (!result.success) {
    return Response.json(
      { error: result.error || "Erreur lors de l'envoi de l'email." },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    message: 'Rapport envoyé par email.',
  });
}
