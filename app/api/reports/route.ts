import { NextRequest } from 'next/server';
import { getUserReports } from '@/lib/report-store';
import { getCredits } from '@/lib/credits';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return Response.json({ error: 'userId requis.' }, { status: 400 });
  }

  // Verify user exists
  const { data: user } = await getSupabase().auth.admin.getUserById(userId);
  if (!user?.user) {
    return Response.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
  }

  const reports = await getUserReports(userId);
  const credits = await getCredits(user.user.email || '');

  return Response.json({ reports, credits });
}
