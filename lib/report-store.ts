import { supabase } from './supabase';
import type { Report } from './types';

// Save report to Supabase for persistence
export async function persistReport(report: Report, userId?: string) {
  const { error } = await supabase.from('reports').upsert({
    id: report.id,
    user_id: userId || null,
    email: report.onboarding ? sessionEmail(report) : '',
    url_analyzed: report.url,
    report_data: report,
    created_at: report.createdAt,
  }, { onConflict: 'id' });

  if (error) console.error('Report persist error:', error);
}

function sessionEmail(report: Report): string {
  // Email is stored in the analysis record, not in the report itself
  return '';
}

// Get report from Supabase
export async function getPersistedReport(id: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('report_data')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data.report_data as Report;
}

// Get all reports for a user
export async function getUserReports(userId: string): Promise<{
  id: string;
  url: string;
  score: number;
  createdAt: string;
}[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, url_analyzed, report_data, created_at')
    .eq('user_id', userId)
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

// Link an anonymous report to a user after they sign up
export async function linkReportToUser(reportId: string, userId: string, email: string) {
  await supabase
    .from('reports')
    .update({ user_id: userId, email })
    .eq('id', reportId);
}
