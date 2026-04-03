import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  let body: { email: string; reportId: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const { email, reportId } = body;
  if (!email || !reportId) {
    return Response.json({ error: 'Email et rapport requis.' }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return Response.json({ error: 'Stripe non configuré.' }, { status: 500 });
  }

  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  // Create Stripe Checkout Session via API
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'mode': 'payment',
      'customer_email': email,
      'line_items[0][price]': process.env.STRIPE_PRICE_ID || '',
      'line_items[0][quantity]': '1',
      'success_url': `${baseUrl}/report/${reportId}?paid=true`,
      'cancel_url': `${baseUrl}/report/${reportId}?paid=false`,
      'metadata[email]': email,
      'metadata[reportId]': reportId,
      'metadata[credits]': '3',
    }),
  });

  const session = await res.json();

  if (session.error) {
    return Response.json({ error: session.error.message }, { status: 500 });
  }

  return Response.json({ url: session.url });
}
