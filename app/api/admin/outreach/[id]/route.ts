import { NextRequest } from 'next/server';
import { isAdminEmail, getOutreachById, deleteOutreach } from '@/lib/admin';

// GET /api/admin/outreach/[id] — detail
export async function GET(
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
    return Response.json(result);
  } catch (err) {
    console.error('Outreach detail error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/admin/outreach/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const email = request.headers.get('x-user-email');
  if (!email || !isAdminEmail(email)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const ok = await deleteOutreach(id);
    if (!ok) {
      return Response.json({ error: 'Failed to delete' }, { status: 500 });
    }
    return Response.json({ success: true });
  } catch (err) {
    console.error('Outreach delete error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
