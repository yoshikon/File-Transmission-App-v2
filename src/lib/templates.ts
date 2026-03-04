import { supabase } from './supabase';
import type { EmailTemplate } from '../types';

export async function fetchTemplates(userId: string): Promise<{ data: EmailTemplate[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .or(`user_id.eq.${userId},is_shared.eq.true`)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createTemplate(
  userId: string,
  template: { name: string; subject: string; body: string; is_shared: boolean }
): Promise<{ data: EmailTemplate | null; error: string | null }> {
  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      user_id: userId,
      name: template.name,
      subject: template.subject,
      body: template.body,
      is_shared: template.is_shared,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function updateTemplate(
  templateId: string,
  updates: { name?: string; subject?: string; body?: string; is_shared?: boolean }
): Promise<{ data: EmailTemplate | null; error: string | null }> {
  const { data, error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function deleteTemplate(templateId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
