import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { shouldUpdateStatus } from '@/lib/admin';

// POST /api/webhooks/brevo — Brevo event webhook (public endpoint)
export async function POST(request: NextRequest) {
  let payload: {
    event: string;
    'message-id'?: string;
    messageId?: string;
    email?: string;
    ts_event?: number;
    tag?: string[];
  };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const brevoMessageId = payload['message-id'] || payload.messageId;
  if (!brevoMessageId) {
    // Not an email event we can track — respond OK so Brevo doesn't retry
    return Response.json({ ok: true });
  }

  const supabase = getSupabase();

  // Find the outreach record by brevo_message_id
  const { data: outreach, error } = await supabase
    .from('email_outreach')
    .select('id, status, opened_at, clicked_at')
    .eq('brevo_message_id', brevoMessageId)
    .single();

  if (error || !outreach) {
    // Unknown message ID — respond OK anyway
    return Response.json({ ok: true });
  }

  const event = payload.event?.toLowerCase();
  const now = new Date().toISOString();

  switch (event) {
    case 'opened':
    case 'unique_opened': {
      if (shouldUpdateStatus(outreach.status, 'opened') && !outreach.opened_at) {
        await supabase
          .from('email_outreach')
          .update({ status: 'opened', opened_at: now })
          .eq('id', outreach.id);
      }
      break;
    }

    case 'click': {
      const updates: Record<string, string> = {};
      if (!outreach.opened_at) updates.opened_at = now;
      if (!outreach.clicked_at) updates.clicked_at = now;

      if (shouldUpdateStatus(outreach.status, 'clicked')) {
        updates.status = 'clicked';
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('email_outreach')
          .update(updates)
          .eq('id', outreach.id);
      }
      break;
    }

    case 'hard_bounce':
    case 'soft_bounce':
    case 'hardbounce':
    case 'softbounce': {
      const bounceType = event.includes('hard') ? 'hard' : 'soft';
      await supabase
        .from('email_outreach')
        .update({ status: 'bounced', bounce_type: bounceType })
        .eq('id', outreach.id);
      break;
    }

    case 'unsubscribe': {
      await supabase
        .from('email_outreach')
        .update({ status: 'unsubscribed' })
        .eq('id', outreach.id);
      break;
    }

    case 'delivered': {
      // Don't change status — already "sent"
      break;
    }

    default:
      break;
  }

  // Always return 200 to prevent Brevo retries
  return Response.json({ ok: true });
}
