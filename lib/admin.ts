import { getSupabase } from './supabase';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'maxence.cailleau1@gmail.com';

// Check if an email is the admin email
export function isAdminEmail(email: string): boolean {
  return email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();
}

// ─── Outreach DB operations ───

export interface OutreachRecord {
  id: string;
  report_id: string;
  email: string;
  domain: string;
  status: string;
  brevo_message_id: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  claimed_at: string | null;
  bounce_type: string | null;
  created_at: string;
}

export async function getOutreachStats() {
  const supabase = getSupabase();

  const { data: all, error } = await supabase
    .from('email_outreach')
    .select('status');

  if (error || !all) return { total: 0, openRate: 0, clickRate: 0, claimed: 0 };

  const total = all.length;
  const sent = all.filter((r) => r.status !== 'queued').length;
  const opened = all.filter((r) => ['opened', 'clicked', 'claimed'].includes(r.status)).length;
  const clicked = all.filter((r) => ['clicked', 'claimed'].includes(r.status)).length;
  const claimed = all.filter((r) => r.status === 'claimed').length;

  return {
    total,
    openRate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
    clickRate: sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0,
    claimed,
  };
}

export async function getOutreachList(params: {
  page: number;
  status?: string;
  search?: string;
}) {
  const supabase = getSupabase();
  const perPage = 25;
  const offset = (params.page - 1) * perPage;

  let query = supabase
    .from('email_outreach')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  if (params.search) {
    query = query.or(`email.ilike.%${params.search}%,domain.ilike.%${params.search}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Outreach list error:', error);
    return { items: [], total: 0 };
  }

  // Fetch report scores for each outreach
  const reportIds = (data || []).map((d) => d.report_id).filter(Boolean);
  let reportScores: Record<string, number> = {};

  if (reportIds.length > 0) {
    const { data: reports } = await supabase
      .from('reports')
      .select('id, report_data')
      .in('id', reportIds);

    if (reports) {
      for (const r of reports) {
        const rd = r.report_data as { technicalScore?: { total: number }; editorialAnalysis?: { score_editorial: number } };
        const tech = rd?.technicalScore?.total ?? 0;
        const editorial = rd?.editorialAnalysis?.score_editorial ?? 0;
        reportScores[r.id] = rd?.editorialAnalysis
          ? Math.round((tech + editorial) / 2)
          : tech;
      }
    }
  }

  return {
    items: (data || []).map((d) => ({
      ...d,
      report_score: reportScores[d.report_id] ?? null,
    })),
    total: count || 0,
  };
}

export async function getOutreachById(id: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('email_outreach')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  // Fetch report data
  let reportData = null;
  if (data.report_id) {
    const { data: report } = await supabase
      .from('reports')
      .select('report_data')
      .eq('id', data.report_id)
      .single();
    reportData = report?.report_data ?? null;
  }

  return { outreach: data, reportData };
}

export async function createOutreachRecord(params: {
  reportId: string;
  email: string;
  domain: string;
  brevoMessageId?: string;
}) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('email_outreach')
    .insert({
      report_id: params.reportId,
      email: params.email,
      domain: params.domain,
      status: params.brevoMessageId ? 'sent' : 'queued',
      brevo_message_id: params.brevoMessageId || null,
      sent_at: params.brevoMessageId ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    console.error('Create outreach error:', error);
    return null;
  }

  return data;
}

export async function updateOutreachStatus(
  id: string,
  updates: Partial<{
    status: string;
    brevo_message_id: string;
    sent_at: string;
    opened_at: string;
    clicked_at: string;
    claimed_at: string;
    bounce_type: string;
  }>
) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('email_outreach')
    .update(updates)
    .eq('id', id);

  if (error) console.error('Update outreach error:', error);
}

export async function deleteOutreach(id: string) {
  const supabase = getSupabase();

  // Set report as expired
  const { data: outreach } = await supabase
    .from('email_outreach')
    .select('report_id')
    .eq('id', id)
    .single();

  if (outreach?.report_id) {
    await supabase
      .from('reports')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', outreach.report_id);
  }

  const { error } = await supabase
    .from('email_outreach')
    .delete()
    .eq('id', id);

  if (error) console.error('Delete outreach error:', error);
  return !error;
}

// Check if an email already has been contacted
export async function checkExistingOutreach(email: string) {
  const supabase = getSupabase();

  const { data } = await supabase
    .from('email_outreach')
    .select('id, status, sent_at')
    .eq('email', email.toLowerCase().trim())
    .in('status', ['sent', 'opened', 'clicked'])
    .order('sent_at', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    return data[0];
  }
  return null;
}

// Status priority order
const STATUS_PRIORITY: Record<string, number> = {
  queued: 0,
  sent: 1,
  opened: 2,
  clicked: 3,
  claimed: 4,
};

export function shouldUpdateStatus(current: string, incoming: string): boolean {
  return (STATUS_PRIORITY[incoming] ?? 0) > (STATUS_PRIORITY[current] ?? 0);
}
