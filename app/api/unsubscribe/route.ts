import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// GET /api/unsubscribe?email=xxx&report=yyy — public endpoint
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  const reportId = request.nextUrl.searchParams.get('report');

  if (!email) {
    return new Response(unsubscribeHtml('Lien de désabonnement invalide.', false), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const supabase = getSupabase();

  // Update all outreach records for this email
  await supabase
    .from('email_outreach')
    .update({ status: 'unsubscribed' })
    .eq('email', email.toLowerCase().trim());

  return new Response(unsubscribeHtml('Vous avez été désabonné avec succès.', true), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function unsubscribeHtml(message: string, success: boolean): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Désabonnement — Mamie SEO</title>
  <style>
    body {
      margin: 0; padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F8F8F7;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: white;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      padding: 48px 32px;
      max-width: 420px;
      text-align: center;
    }
    .icon { font-size: 32px; margin-bottom: 16px; }
    h1 { font-size: 18px; font-weight: 500; color: #1A1A18; margin: 0 0 8px; }
    p { font-size: 14px; color: #73726C; margin: 0; line-height: 1.5; }
    a { color: #1A1A18; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✓' : '⚠️'}</div>
    <h1>${message}</h1>
    <p style="margin-top:12px;">
      ${success
        ? 'Vous ne recevrez plus d\'emails de notre part.'
        : 'Veuillez réessayer ou nous contacter directement.'}
    </p>
    <p style="margin-top:24px;"><a href="/">Retour à l'accueil</a></p>
  </div>
</body>
</html>`;
}
