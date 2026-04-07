import { NextRequest } from 'next/server';
import { isAdminEmail, getOutreachStats } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const email = request.headers.get('x-user-email');

  if (!email || !isAdminEmail(email)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const stats = await getOutreachStats();
    return Response.json(stats);
  } catch (err) {
    console.error('Admin stats error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
