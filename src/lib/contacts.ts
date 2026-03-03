import { supabase } from './supabase';
import type { Contact } from '../types';

export async function fetchContacts(): Promise<Contact[]> {
  const { data } = await supabase
    .from('contacts')
    .select('*')
    .order('name', { ascending: true });

  return (data as Contact[]) ?? [];
}

export async function createContact(
  userId: string,
  contact: { name: string; email: string; company: string; tags: string[] }
): Promise<{ data: Contact | null; error: string | null }> {
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_id: userId,
      name: contact.name,
      email: contact.email,
      company: contact.company || null,
      tags: contact.tags,
    })
    .select()
    .maybeSingle();

  return { data: data as Contact | null, error: error?.message ?? null };
}

export async function updateContact(
  id: string,
  updates: { name: string; email: string; company: string; tags: string[] }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('contacts')
    .update({
      name: updates.name,
      email: updates.email,
      company: updates.company || null,
      tags: updates.tags,
    })
    .eq('id', id);

  return { error: error?.message ?? null };
}

export async function deleteContact(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
