import { supabase } from './supabase';

export async function getCredits(email: string): Promise<number> {
  const { data } = await supabase
    .from('credits')
    .select('amount')
    .eq('email', email.toLowerCase().trim())
    .single();

  return data?.amount ?? 0;
}

export async function deductCredit(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();

  // Try atomic decrement via SQL function first
  const { error: rpcError } = await supabase.rpc('deduct_credit', {
    p_email: normalizedEmail,
  });

  if (!rpcError) return true;

  // Fallback if SQL function not set up: read-then-write with guard
  const current = await getCredits(normalizedEmail);
  if (current <= 0) return false;

  const { error: updateError } = await supabase
    .from('credits')
    .update({ amount: current - 1, updated_at: new Date().toISOString() })
    .eq('email', normalizedEmail)
    .gt('amount', 0); // Guard: only update if still > 0

  return !updateError;
}

export async function addCredits(email: string, amount: number): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  // Try upsert with increment
  const { data: existing } = await supabase
    .from('credits')
    .select('amount')
    .eq('email', normalizedEmail)
    .single();

  if (!existing) {
    // Insert new row
    await supabase.from('credits').insert({
      email: normalizedEmail,
      amount,
    });
  } else {
    // Update existing — add to current amount
    await supabase
      .from('credits')
      .update({
        amount: existing.amount + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('email', normalizedEmail);
  }
}
