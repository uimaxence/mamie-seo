import { getSupabase } from './supabase';
import type { Report } from './types';

// Save report to Supabase for persistence
export async function persistReport(report: Report, userId?: string, email?: string) {
  const { error } = await getSupabase().from('reports').upsert({
    id: report.id,
    user_id: userId || null,
    email: email || '',
    url_analyzed: report.url,
    report_data: report,
    created_at: report.createdAt,
  }, { onConflict: 'id' });

  if (error) console.error('Report persist error:', error);
}

// Get report from Supabase
export async function getPersistedReport(id: string): Promise<Report | null> {
  const { data, error } = await getSupabase()
    .from('reports')
    .select('report_data')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data.report_data as Report;
}

// Get all reports for a user (by user_id or by email)
export async function getUserReports(userIdOrEmail: string, isEmail = false): Promise<{
  id: string;
  url: string;
  score: number;
  createdAt: string;
}[]> {
  const column = isEmail ? 'email' : 'user_id';
  const { data, error } = await getSupabase()
    .from('reports')
    .select('id, url_analyzed, report_data, created_at')
    .eq(column, userIdOrEmail)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data.map((row) => {
    const report = row.report_data as Report;
    const editorialScore = report.editorialAnalysis?.score_editorial ?? 0;
    const techScore = report.technicalScore?.total ?? 0;
    const score = report.editorialAnalysis
      ? Math.round((techScore + editorialScore) / 2)
      : techScore;

    return {
      id: row.id,
      url: row.url_analyzed,
      score,
      createdAt: row.created_at,
    };
  });
}

// Link anonymous reports to a user after signup (by email match)
export async function linkReportsToUser(userId: string, email: string) {
  await getSupabase()
    .from('reports')
    .update({ user_id: userId })
    .eq('email', email.toLowerCase().trim())
    .is('user_id', null);
}
