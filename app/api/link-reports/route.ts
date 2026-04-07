import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { linkReportsToUser } from '@/lib/report-store';

export async function POST(request: NextRequest) {
  let body: { email?: string; reportId?: string; userId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const { email, reportId, userId } = body;

  if (!email && !reportId) {
    return Response.json({ error: 'Email ou reportId requis.' }, { status: 400 });
  }

  const supabase = getSupabase();
  let resolvedUserId = userId;

  // If no userId provided, try to find user by email
  if (!resolvedUserId && email) {
    try {
      const { data } = await supabase.auth.admin.listUsers();
      const user = data?.users?.find((u) => u.email === email.toLowerCase().trim());
      if (user) resolvedUserId = user.id;
    } catch (err) {
      console.error('listUsers error:', err);
    }
  }

  if (!resolvedUserId) {
    return Response.json({ linked: false, reason: 'User not found' });
  }

  // Link specific report by ID if provided
  if (reportId) {
    const { error: updateErr } = await supabase
      .from('reports')
      .update({ user_id: resolvedUserId, email: email?.toLowerCase().trim() || undefined })
      .eq('id', reportId)
      .is('user_id', null);

    if (updateErr) {
      console.error('Link report by ID error:', updateErr);
    }
  }

  // Also link any other reports by email (for users who had previous analyses)
  if (email) {
    await linkReportsToUser(resolvedUserId, email);
  }

  return Response.json({ linked: true });
}
