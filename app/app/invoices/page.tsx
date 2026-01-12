import { createSupabaseServerClient } from '@/lib/supabase/server';
import { InvoicesView } from '@/app/app/invoices/InvoicesView';
import { getSenderProfile } from '@/lib/reminders/profile';

export default async function InvoicesPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: clients = [] } = await supabase
    .from('clients')
    .select('id, name, email')
    .eq('user_id', user?.id ?? '')
    .order('created_at', { ascending: false });

  const { data: invoices = [] } = await supabase
    .from('invoices')
    .select(
      'id, invoice_number, amount_pennies, due_date, issue_date, status, paid_at, created_at, client_id, clients(name, email), reminders(sent_at)'
    )
    .eq('user_id', user?.id ?? '')
    .order('created_at', { ascending: false });

  const { data: rules = [] } = await supabase
    .from('reminder_rules')
    .select('days_offset, tone, enabled')
    .eq('user_id', user?.id ?? '')
    .eq('enabled', true);

  const senderProfile = await getSenderProfile(supabase, user?.id ?? '');
  const senderProfileWithFallback = senderProfile
    ? {
        ...senderProfile,
        replyToEmail: senderProfile.replyToEmail ?? user?.email ?? null
      }
    : {
        replyToEmail: user?.email ?? null
      };

  return (
    <InvoicesView
      clients={clients}
      initialInvoices={invoices}
      rules={rules}
      senderProfile={senderProfileWithFallback}
    />
  );
}
