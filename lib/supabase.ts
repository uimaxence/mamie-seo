import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

// Server-side client with service role key (full access), lazily initialized
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    _supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabase;
}

// ─── Admin emails — unlimited analyses and credits ───

const ADMIN_EMAILS = [
  'maxence.cailleau1@gmail.com',
];

export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

// ─── Check if an email or IP has already used their free analysis ───

export async function hasAlreadyAnalyzed(email: string, ip: string): Promise<{
  limited: boolean;
  reason?: string;
  luckyDay?: boolean;
}> {
  // Admin bypass — unlimited
  if (isAdmin(email)) {
    return { limited: false };
  }

  const supabase = getSupabase();
  const normalizedEmail = email.toLowerCase().trim();

  // Count analyses by email
  const { data: emailData, error: emailErr } = await supabase
    .from('analyses')
    .select('id')
    .eq('email', normalizedEmail);

  if (emailErr) {
    console.error('Supabase email check error:', emailErr);
    // Fail open — allow analysis if DB is unreachable
    return { limited: false };
  }

  const emailCount = emailData?.length ?? 0;

  // Count analyses by IP
  const { data: ipData, error: ipErr } = await supabase
    .from('analyses')
    .select('id')
    .eq('ip_address', ip);

  if (ipErr) {
    console.error('Supabase IP check error:', ipErr);
    return { limited: false };
  }

  const ipCount = ipData?.length ?? 0;

  const maxCount = Math.max(emailCount, ipCount);

  // First analysis: no problem
  if (maxCount === 0) {
    return { limited: false };
  }

  // Second analysis: "lucky day" — allow it
  if (maxCount === 1) {
    return { limited: false, luckyDay: true };
  }

  // 2+ analyses: blocked, must go Pro
  return {
    limited: true,
    reason: 'Vous avez utilisé vos 2 analyses gratuites. Passez en Pro pour continuer !',
  };
}

// ─── Record an analysis ───

export async function recordAnalysis(params: {
  email: string;
  ip: string;
  url: string;
  reportId: string;
}) {
  const supabase = getSupabase();
  const { error } = await supabase.from('analyses').insert({
    email: params.email.toLowerCase().trim(),
    ip_address: params.ip,
    url_analyzed: params.url,
    report_id: params.reportId,
  });

  if (error) {
    console.error('Supabase insert error:', error);
    // Don't throw — analysis should still work even if tracking fails
  }
}

// ─── Save email to leads table ───

export async function saveEmail(email: string, reportId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('leads').upsert(
    {
      email: email.toLowerCase().trim(),
      last_report_id: reportId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'email' }
  );

  if (error) {
    console.error('Supabase leads upsert error:', error);
  }
}
