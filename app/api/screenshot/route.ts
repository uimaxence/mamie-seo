import { NextRequest } from 'next/server';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  let body: { url: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const { url } = body;
  if (!url) {
    return Response.json({ error: 'URL requise.' }, { status: 400 });
  }

  // Validate URL
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('http')) throw new Error();
    const hostname = parsed.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
      throw new Error('Private URL');
    }
  } catch {
    return Response.json({ error: 'URL invalide.' }, { status: 400 });
  }

  try {
    const { takeScreenshotAsBase64 } = await import('@/lib/screenshot');
    const base64 = await takeScreenshotAsBase64(url);
    return Response.json({ screenshot: base64 });
  } catch (err) {
    // Playwright may not be available in all environments
    // Fall back gracefully
    console.error('Screenshot error:', err);
    return Response.json({ screenshot: null, fallback: true });
  }
}
