import { NextRequest } from 'next/server';
import { addCredits } from '@/lib/credits';
import { createHmac, timingSafeEqual } from 'crypto';

// Verify Stripe webhook signature
function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts['t'];
  const v1Signature = parts['v1'];
  if (!timestamp || !v1Signature) return false;

  // Reject if timestamp is older than 5 minutes (replay protection)
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1Signature));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Verify signature
  if (!sig || !webhookSecret) {
    return Response.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  if (!verifyStripeSignature(body, sig, webhookSecret)) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const event = JSON.parse(body);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.metadata?.email || session.customer_email;
      const credits = parseInt(session.metadata?.credits || '3', 10);

      if (email) {
        await addCredits(email, credits);
        console.log(`Added ${credits} credits to ${email}`);
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return Response.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
}
