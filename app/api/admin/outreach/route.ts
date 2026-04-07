import { NextRequest } from 'next/server';
import { isAdminEmail, getOutreachList } from '@/lib/admin';

// GET /api/admin/outreach — paginated list
export async function GET(request: NextRequest) {
  const email = request.headers.get('x-user-email');
  if (!email || !isAdminEmail(email)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search') || undefined;

  try {
    const result = await getOutreachList({ page, status, search });
    return Response.json(result);
  } catch (err) {
    console.error('Outreach list error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
