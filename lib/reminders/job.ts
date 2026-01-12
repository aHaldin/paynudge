import { differenceInCalendarDays, startOfDay, subHours } from 'date-fns';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatDate, formatGBP } from '@/lib/format';
import { sendReminderEmail } from '@/lib/reminders/email';
import { SenderProfile } from '@/lib/email/renderReminder';
import { getSenderProfile } from '@/lib/reminders/profile';
import { hasAccess } from '@/lib/billing/access';

export type ReminderJobSummary = {
  rulesProcessed: number;
  invoicesMatched: number;
  remindersSent: number;
  skippedDuplicates: number;
  skippedMissingEmail: number;
};

export async function runDailyReminderJob(): Promise<ReminderJobSummary> {
  const supabase = createSupabaseAdminClient();
  const today = startOfDay(new Date());
  const twentyFourHoursAgo = subHours(new Date(), 24);
  const templateCache = new Map<
    string,
    { subjectTemplate: string; bodyTemplate: string } | null
  >();
  const senderProfileCache = new Map<string, SenderProfile | null>();
  const billingCache = new Map<
    string,
    { subscription_status: string | null; trial_ends_at: string | null } | null
  >();

  const { data: rulesData, error: ruleError } = await supabase
    .from('reminder_rules')
    .select('*')
    .eq('enabled', true);

  if (ruleError) {
    throw new Error(ruleError.message);
  }
  const rules = rulesData ?? [];

  const summary: ReminderJobSummary = {
    rulesProcessed: rules.length,
    invoicesMatched: 0,
    remindersSent: 0,
    skippedDuplicates: 0,
    skippedMissingEmail: 0
  };

  for (const rule of rules) {
    if (!billingCache.has(rule.user_id)) {
      const { data: billingProfile } = await supabase
        .from('profiles')
        .select('subscription_status, trial_ends_at')
        .eq('id', rule.user_id)
        .maybeSingle();
      billingCache.set(rule.user_id, billingProfile ?? null);
    }

    const billingProfile = billingCache.get(rule.user_id) ?? null;
    if (!hasAccess(billingProfile)) {
      continue;
    }
    const { data: invoicesData, error: invoiceError } = await supabase
      .from('invoices')
      .select(
        'id, user_id, client_id, invoice_number, amount_pennies, issue_date, due_date, status, paid_at, clients(name,email)'
      )
      .eq('user_id', rule.user_id)
      .eq('status', 'sent')
      .is('paid_at', null);

    if (invoiceError) {
      console.error('Invoice fetch failed', invoiceError.message);
      continue;
    }

    const invoices = invoicesData ?? [];
    for (const invoice of invoices) {
      if (invoice.status === 'paid' || invoice.status === 'cancelled' || invoice.status === 'void') {
        continue;
      }
      if (invoice.paid_at) {
        continue;
      }
      const client = Array.isArray(invoice.clients)
        ? invoice.clients[0] ?? null
        : invoice.clients ?? null;
      const dueDate = new Date(invoice.due_date);
      const offset = differenceInCalendarDays(today, dueDate);

      if (offset !== rule.days_offset) {
        continue;
      }

      summary.invoicesMatched += 1;

      if (!client?.email) {
        summary.skippedMissingEmail += 1;
        continue;
      }

      const { data: existingRemindersData, error: reminderError } = await supabase
        .from('reminders')
        .select('id')
        .eq('invoice_id', invoice.id)
        .eq('rule_id', rule.id)
        .gte('sent_at', twentyFourHoursAgo.toISOString());

      if (reminderError) {
        console.error('Reminder check failed', reminderError.message);
        continue;
      }

      const existingReminders = existingRemindersData ?? [];
      if (existingReminders.length > 0) {
        summary.skippedDuplicates += 1;
        continue;
      }

      try {
        let templates = templateCache.get(`${rule.user_id}:${rule.tone}`);
        if (!templates) {
          const { data: storedTemplatesData } = await supabase
            .from('reminder_templates')
            .select('tone, subject, body')
            .eq('user_id', rule.user_id)
            .eq('tone', rule.tone)
            .limit(1);

          const storedTemplates = storedTemplatesData ?? [];
          const templateRecord = storedTemplates[0] ?? null;

          templates = templateRecord
            ? {
                subjectTemplate: templateRecord.subject,
                bodyTemplate: templateRecord.body
              }
            : null;

          templateCache.set(`${rule.user_id}:${rule.tone}`, templates);
        }

        const amount = formatGBP(invoice.amount_pennies);
        const dueDateLabel = formatDate(invoice.due_date);
        const issueDateLabel = formatDate(invoice.issue_date);
        let senderProfile = senderProfileCache.get(rule.user_id) ?? null;

        if (!senderProfileCache.has(rule.user_id)) {
          senderProfile = await getSenderProfile(supabase, rule.user_id);
          if (!senderProfile?.replyToEmail) {
            const { data: userRecord } = await supabase.auth.admin.getUserById(
              rule.user_id
            );
            senderProfile = {
              ...(senderProfile ?? {}),
              replyToEmail: userRecord?.user?.email ?? null
            };
          }
          senderProfileCache.set(rule.user_id, senderProfile);
        }

        const result = await sendReminderEmail({
          tone: rule.tone,
          daysOffset: rule.days_offset,
          invoiceNumber: invoice.invoice_number,
          amount,
          dueDate: dueDateLabel,
          issueDate: issueDateLabel,
          clientName: client?.name ?? 'there',
          clientEmail: client.email,
          businessName: process.env.BUSINESS_NAME ?? null,
          subjectTemplate: templates?.subjectTemplate ?? null,
          bodyTemplate: templates?.bodyTemplate ?? null,
          senderProfile
        });

        const { error: insertError } = await supabase.from('reminders').insert({
          user_id: invoice.user_id,
          invoice_id: invoice.id,
          rule_id: rule.id,
          subject: result.subject,
          body: result.body,
          sent_to: client.email,
          provider_id: result.providerId
        });

        if (insertError) {
          console.error('Reminder insert failed', insertError.message);
          continue;
        }

        summary.remindersSent += 1;
      } catch (error) {
        console.error('Email send failed', error);
      }
    }
  }

  return summary;
}
