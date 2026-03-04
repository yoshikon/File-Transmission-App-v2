import { supabase } from './supabase';

export interface SearchResult {
  id: string;
  type: 'delivery' | 'contact' | 'template';
  title: string;
  subtitle: string;
  url: string;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const q = `%${query}%`;

  const [deliveriesRes, contactsRes, templatesRes] = await Promise.all([
    supabase
      .from('deliveries')
      .select('id, subject, status, created_at, delivery_recipients(recipient_email)')
      .or(`subject.ilike.${q}`)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('contacts')
      .select('id, name, email, company')
      .or(`name.ilike.${q},email.ilike.${q},company.ilike.${q}`)
      .limit(5),
    supabase
      .from('email_templates')
      .select('id, name, subject')
      .or(`name.ilike.${q},subject.ilike.${q}`)
      .limit(5),
  ]);

  const results: SearchResult[] = [];

  if (deliveriesRes.data) {
    for (const d of deliveriesRes.data) {
      const recipients = (d.delivery_recipients as { recipient_email: string }[]) || [];
      const recipientText = recipients.length > 0
        ? recipients.map((r) => r.recipient_email).slice(0, 2).join(', ')
        : '';
      results.push({
        id: d.id,
        type: 'delivery',
        title: d.subject,
        subtitle: recipientText || d.status,
        url: `/history/${d.id}`,
      });
    }
  }

  if (contactsRes.data) {
    for (const c of contactsRes.data) {
      results.push({
        id: c.id,
        type: 'contact',
        title: c.name || c.email,
        subtitle: c.company || c.email,
        url: '/contacts',
      });
    }
  }

  if (templatesRes.data) {
    for (const t of templatesRes.data) {
      results.push({
        id: t.id,
        type: 'template',
        title: t.name,
        subtitle: t.subject,
        url: '/templates',
      });
    }
  }

  return results;
}
