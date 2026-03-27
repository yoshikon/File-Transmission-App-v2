import { supabase } from './supabase';
import type { Signature } from '../types';

export async function fetchSignatures(userId: string): Promise<{ data: Signature[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createSignature(
  userId: string,
  signature: { name: string; content_html: string }
): Promise<{ data: Signature | null; error: string | null }> {
  const { data, error } = await supabase
    .from('signatures')
    .insert({
      user_id: userId,
      name: signature.name,
      content_html: signature.content_html,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function updateSignature(
  signatureId: string,
  updates: { name?: string; content_html?: string }
): Promise<{ data: Signature | null; error: string | null }> {
  const { data, error } = await supabase
    .from('signatures')
    .update(updates)
    .eq('id', signatureId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function deleteSignature(signatureId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('signatures')
    .delete()
    .eq('id', signatureId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
