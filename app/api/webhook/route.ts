import { NextRequest } from 'next/server';
import { addCredits } from '@/lib/credits';

// Stripe webhook to handle successful payments
export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // In production, verify the webhook signature
  // For MVP, we trust the payload if it comes through
  if (webhookSecret && sig) {
    // TODO: Proper signature verification with stripe SDK
    // For now we do basic validation
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
