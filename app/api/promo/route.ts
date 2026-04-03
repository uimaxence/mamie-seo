import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { addCredits } from '@/lib/credits';

export async function POST(request: NextRequest) {
  let body: { code: string; email: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const { code, email } = body;
  if (!code || !email) {
    return Response.json({ error: 'Code promo et email requis.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const normalizedCode = code.trim().toUpperCase();

  // Lookup promo code
  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', normalizedCode)
    .single();

  if (error || !promo) {
    return Response.json({ error: 'Code promo invalide.' }, { status: 404 });
  }

  // Check if expired
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return Response.json({ error: 'Ce code promo a expiré.' }, { status: 410 });
  }

  // Check max uses
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return Response.json({ error: 'Ce code promo a atteint sa limite d\'utilisation.' }, { status: 410 });
  }

  // Check if this email already used this code
  const { data: existing } = await supabase
    .from('promo_uses')
    .select('id')
    .eq('promo_code', normalizedCode)
    .eq('email', email.toLowerCase().trim())
    .single();

  if (existing) {
    return Response.json({ error: 'Vous avez déjà utilisé ce code promo.' }, { status: 409 });
  }

  // Apply promo: add credits
  await addCredits(email, promo.credits);

  // Record usage
  await supabase.from('promo_uses').insert({
    promo_code: normalizedCode,
    email: email.toLowerCase().trim(),
  });

  // Increment used_count
  await supabase
    .from('promo_codes')
    .update({ used_count: (promo.used_count || 0) + 1 })
    .eq('code', normalizedCode);

  return Response.json({
    success: true,
    credits: promo.credits,
    message: `${promo.credits} crédit${promo.credits > 1 ? 's' : ''} ajouté${promo.credits > 1 ? 's' : ''} !`,
  });
}
