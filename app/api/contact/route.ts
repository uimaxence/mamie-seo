import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  let body: {
    name?: string;
    email: string;
    subject?: string;
    message: string;
    reportId?: string;
    reportUrl?: string;
    reportScore?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const { email, message } = body;

  if (!email || !message) {
    return Response.json({ error: 'Email et message requis.' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // Try to save to contact_requests table if it exists
    const { error: insertError } = await supabase.from('contact_requests').insert({
      email: email.toLowerCase().trim(),
      name: body.name || null,
      subject: body.subject || null,
      message,
      report_id: body.reportId || null,
      report_url: body.reportUrl || null,
      report_score: body.reportScore ? parseInt(body.reportScore) : null,
      status: 'new',
    });

    if (insertError) {
      // Table might not exist yet — log but don't fail
      console.error('Contact insert error (table may not exist):', insertError.message);
    }

    // Send notification email via Brevo if available
    if (process.env.BREVO_API_KEY) {
      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { email: process.env.BREVO_SENDER_EMAIL || 'contact@maxence-cailleau.fr', name: 'Mamie SEO' },
            to: [{ email: process.env.ADMIN_EMAIL || 'contact@maxence-cailleau.fr' }],
            subject: `[Mamie SEO] Nouveau contact de ${body.name || email}`,
            htmlContent: `
              <h2>Nouveau message de contact</h2>
              <p><strong>Nom:</strong> ${body.name || '—'}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Sujet:</strong> ${body.subject || '—'}</p>
              ${body.reportUrl ? `<p><strong>Site analysé:</strong> ${body.reportUrl} (score ${body.reportScore}/100)</p>` : ''}
              <hr />
              <p>${message.replace(/\n/g, '<br>')}</p>
            `,
          }),
        });
      } catch (emailErr) {
        console.error('Failed to send notification email:', emailErr);
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Contact error:', err);
    return Response.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
