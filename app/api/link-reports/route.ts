import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { linkReportsToUser } from '@/lib/report-store';

export async function POST(request: NextRequest) {
  let body: { email: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const { email } = body;
  if (!email) {
    return Response.json({ error: 'Email requis.' }, { status: 400 });
  }

  // Find the user by email
  const supabase = getSupabase();
  const { data } = await supabase.auth.admin.listUsers();
  const user = data?.users?.find((u) => u.email === email.toLowerCase().trim());

  if (user) {
    await linkReportsToUser(user.id, email);
    return Response.json({ linked: true });
  }

  return Response.json({ linked: false });
}
