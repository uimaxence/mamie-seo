import { NextRequest } from 'next/server';
import { getReport } from '@/lib/store';
import { getPersistedReport } from '@/lib/report-store';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'ID de rapport requis.' }, { status: 400 });
  }

  // Try in-memory first, then Supabase
  let report = getReport(id);
  if (!report) {
    report = await getPersistedReport(id);
  }

  if (!report) {
    return Response.json(
      { error: 'Rapport introuvable ou expiré.' },
      { status: 404 }
    );
  }

  return Response.json(report);
}
