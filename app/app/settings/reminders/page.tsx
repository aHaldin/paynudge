import { Card } from '@/components/ui/Card';
import { ReminderRuleForm } from '@/components/forms/ReminderRuleForm';
import { ReminderTemplateForm } from '@/components/forms/ReminderTemplateForm';
import { defaultTemplates } from '@/lib/reminders/templates-defaults';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReminderTimeline } from '@/app/app/settings/reminders/ReminderTimeline';
import { getSenderProfile } from '@/lib/reminders/profile';

type ReminderRuleRow = {
  id: string;
  days_offset: number;
  tone: 'friendly' | 'neutral' | 'firm';
  enabled: boolean;
};

type PreviewInvoiceRow = {
  invoice_number: string;
  amount_pennies: number;
  due_date: string;
  issue_date: string;
  clients: { name: string; email: string } | null;
};

const normalizePreviewInvoice = (
  invoice: any | null
): PreviewInvoiceRow | null => {
  if (!invoice) return null;
  const client = Array.isArray(invoice.clients)
    ? invoice.clients[0] ?? null
    : invoice.clients ?? null;
  return {
    ...invoice,
    clients: client
  };
};

export default async function ReminderSettingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: rulesData } = await supabase
    .from('reminder_rules')
    .select('*')
    .eq('user_id', user?.id ?? '')
    .order('days_offset', { ascending: true });
  const rules = (rulesData ?? []) as ReminderRuleRow[];

  const { data: templatesData } = await supabase
    .from('reminder_templates')
    .select('tone, subject, body')
    .eq('user_id', user?.id ?? '');

  const refreshedTemplates = templatesData ?? [];

  const templateByTone = new Map(
    refreshedTemplates.map((template) => [template.tone, template])
  );

  const senderProfile = await getSenderProfile(supabase, user?.id ?? '');
  const senderProfileWithFallback = senderProfile
    ? {
        ...senderProfile,
        replyToEmail: senderProfile.replyToEmail ?? user?.email ?? null
      }
    : {
        replyToEmail: user?.email ?? null
      };

  const { data: previewInvoice } = await supabase
    .from('invoices')
    .select('invoice_number, amount_pennies, due_date, issue_date, clients(name, email)')
    .eq('user_id', user?.id ?? '')
    .eq('status', 'sent')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: fallbackInvoice } = await supabase
    .from('invoices')
    .select('invoice_number, amount_pennies, due_date, issue_date, clients(name, email)')
    .eq('user_id', user?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const previewData = normalizePreviewInvoice(
    previewInvoice ?? fallbackInvoice ?? null
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card title="Reminder timeline">
          <p className="text-sm text-slate-500">
            PayNudge automatically sends the right reminder at the right time. You
            can adjust the timing or tone below.
          </p>
          <div className="mt-4">
            <ReminderTimeline
              rules={rules}
              templates={refreshedTemplates}
              previewInvoice={previewData}
              businessName={process.env.BUSINESS_NAME ?? 'PayNudge Billing'}
              senderProfile={senderProfileWithFallback}
            />
          </div>
        </Card>
        <Card title="Add rule">
          <ReminderRuleForm />
        </Card>
      </div>
      <Card title="Email templates">
        <p className="text-sm text-slate-500">
          Most users keep these as-is. PayNudge uses proven, polite wording by default.
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          {defaultTemplates.map((template) => {
            const stored = templateByTone.get(template.tone) ?? template;
            return (
              <div
                key={template.tone}
                className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-4"
              >
                <div>
                  <h3 className="text-sm font-semibold capitalize text-ink">
                    {template.tone} tone
                  </h3>
                  <p className="text-xs text-slate-500">
                    Customize subject and body for this tone.
                  </p>
                </div>
                <ReminderTemplateForm
                  tone={template.tone}
                  subject={stored.subject}
                  body={stored.body}
                />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
