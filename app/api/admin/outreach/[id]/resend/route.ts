import { NextRequest } from 'next/server';
import { isAdminEmail, getOutreachById, updateOutreachStatus } from '@/lib/admin';
import { sendOutreachEmail } from '@/lib/brevo-outreach';
import { getPersistedReport } from '@/lib/report-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const email = request.headers.get('x-user-email');
  if (!email || !isAdminEmail(email)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await getOutreachById(id);
    if (!result) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const { outreach } = result;

    // Get report data
    const report = await getPersistedReport(outreach.report_id);
    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    // Resend via Brevo
    const brevoResult = await sendOutreachEmail(outreach.email, report, outreach.report_id);

    if (!brevoResult.success) {
      return Response.json({ error: brevoResult.error }, { status: 500 });
    }

    // Update outreach record
    await updateOutreachStatus(id, {
      status: 'sent',
      brevo_message_id: brevoResult.messageId,
      sent_at: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('Resend error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
