import { addDays, differenceInCalendarDays, isBefore, startOfDay } from 'date-fns';
import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate, formatGBP } from '@/lib/format';
import { defaultEmailTemplates } from '@/lib/email/templates';
import { renderReminderContent } from '@/lib/email/renderReminder';
import { getSenderProfile } from '@/lib/reminders/profile';
import { DashboardBillingBanner } from '@/components/billing/DashboardBillingBanner';

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: invoices } = await supabase
    .from('invoices')
    .select(
      'id, invoice_number, amount_pennies, due_date, issue_date, status, paid_at, clients(name), reminders(sent_at)'
    )
    .eq('user_id', user?.id ?? '')
    .order('due_date', { ascending: true });

  const invoicesSafe = invoices ?? [];

  const { count: clientCount = 0 } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user?.id ?? '');

  const { data: rules } = await supabase
    .from('reminder_rules')
    .select('days_offset, tone')
    .eq('user_id', user?.id ?? '')
    .eq('enabled', true);

  const rulesSafe = rules ?? [];

  const { data: templatesData } = await supabase
    .from('reminder_templates')
    .select('tone, subject, body')
    .eq('user_id', user?.id ?? '');

  const templates = templatesData ?? [];

  const senderProfile = await getSenderProfile(supabase, user?.id ?? '');
  const { data: profile } = await supabase
    .from('profiles')
    .select('email_signature')
    .eq('id', user?.id ?? '')
    .maybeSingle();
  const hasSignature = Boolean(profile?.email_signature?.trim());
  const senderProfileWithFallback = senderProfile
    ? {
        ...senderProfile,
        replyToEmail: senderProfile.replyToEmail ?? user?.email ?? null
      }
    : {
        replyToEmail: user?.email ?? null
      };

  const { data: billingProfile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at')
    .eq('id', user?.id ?? '')
    .maybeSingle();

  const today = startOfDay(new Date());

  const outstandingInvoices = invoicesSafe.filter(
    (invoice) => invoice.status === 'sent' && !invoice.paid_at
  );

  const hasInvoices = invoicesSafe.length > 0;
  const hasClients = (clientCount ?? 0) > 0;
  const hasRulesEnabled = rulesSafe.length > 0;

  const setupItems = [
    {
      key: 'signature',
      title: 'Add your email signature',
      helper: 'Used in every reminder email.',
      href: '/app/account',
      complete: hasSignature
    },
    {
      key: 'clients',
      title: 'Add your first client',
      helper: 'Add who you invoice.',
      href: '/app/clients',
      complete: hasClients
    },
    {
      key: 'invoices',
      title: 'Add your first invoice',
      helper: 'Create an invoice to start reminders.',
      href: '/app/invoices',
      complete: hasInvoices
    },
    {
      key: 'rules',
      title: 'Set reminder rules',
      helper: 'Choose when reminders are sent.',
      href: '/app/settings/reminders',
      complete: hasRulesEnabled
    }
  ];

  const pendingSetupItems = setupItems.filter((item) => !item.complete);

  const totalOutstanding = outstandingInvoices.reduce(
    (sum, invoice) => sum + (invoice.amount_pennies ?? 0),
    0
  );

  const overdueCount = outstandingInvoices.filter((invoice) => {
    const due = new Date(invoice.due_date);
    return isBefore(due, today);
  }).length;

  const rows = invoicesSafe.map((invoice) => {
    const reminders = invoice.reminders ?? [];
    const lastReminder = reminders
      .map((reminder) => new Date(reminder.sent_at))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      ...invoice,
      lastReminder
    };
  });

  const getClientName = (invoice: any) => {
    if (!invoice?.clients) return 'Client';
    if (Array.isArray(invoice.clients)) {
      return invoice.clients[0]?.name ?? 'Client';
    }
    return invoice.clients?.name ?? 'Client';
  };

  const nextReminderDate = outstandingInvoices.reduce<Date | null>((next, invoice) => {
    const dueDate = startOfDay(new Date(invoice.due_date));
    for (const rule of rulesSafe) {
      const reminderDate = addDays(dueDate, rule.days_offset);
      if (reminderDate < today) {
        continue;
      }
      if (!next || reminderDate.getTime() < next.getTime()) {
        next = reminderDate;
      }
    }
    return next;
  }, null);

  const monitoredCount = outstandingInvoices.length;
  const nextReminderText = nextReminderDate
    ? (() => {
        const days = differenceInCalendarDays(nextReminderDate, today);
        if (days === 0) return 'today';
        if (days === 1) return 'tomorrow';
        return `in ${days} days`;
      })()
    : null;

  const statusMessage =
    monitoredCount === 0
      ? 'No invoices yet. Add your first invoice to start automated reminders.'
      : nextReminderText
        ? `Next reminder scheduled ${nextReminderText}. ${monitoredCount} invoice${monitoredCount === 1 ? '' : 's'} being monitored.`
        : `${monitoredCount} invoice${monitoredCount === 1 ? '' : 's'} being monitored.`;

  const sortedRules = [...rulesSafe].sort((a, b) => a.days_offset - b.days_offset);
  const previewRule = sortedRules[0] ?? null;
  const previewInvoice = outstandingInvoices[0] ?? null;
  const previewTone = previewRule?.tone ?? 'friendly';
  const previewToneKey: 'friendly' | 'neutral' | 'firm' =
    previewTone === 'neutral' || previewTone === 'firm' ? previewTone : 'friendly';
  const previewTiming =
    previewRule?.days_offset === undefined
      ? 'No reminder rules set'
      : previewRule.days_offset === 0
        ? 'Sent on the due date'
        : previewRule.days_offset < 0
          ? `Sent ${Math.abs(previewRule.days_offset)} days before due date`
          : `Sent ${previewRule.days_offset} days after due date`;

  const previewToneCopy = previewRule
    ? `${previewTone.charAt(0).toUpperCase() + previewTone.slice(1)} reminder - ${previewTiming.toLowerCase()} to keep things polite and professional.`
    : 'Friendly reminder - sent at the right moment to keep things polite and professional.';

  const storedTemplate = templates.find(
    (template) => template.tone === previewTone
  );
  const previewTemplate = storedTemplate ?? defaultEmailTemplates[previewToneKey];
  const previewClient = (previewInvoice
    ? Array.isArray(previewInvoice.clients)
      ? previewInvoice.clients[0] ?? null
      : previewInvoice.clients ?? null
    : null) as { name?: string | null; email?: string | null } | null;

  const preview = previewInvoice
    ? renderReminderContent({
        templateSubject: previewTemplate.subject,
        templateBody: previewTemplate.body,
        tone: previewTone,
        daysOffset: previewRule?.days_offset ?? 0,
        clientName: previewClient?.name ?? 'Client',
        invoiceNumber: previewInvoice.invoice_number,
        amount: formatGBP(previewInvoice.amount_pennies),
        dueDate: formatDate(previewInvoice.due_date),
        issueDate: formatDate(previewInvoice.issue_date),
        businessName: process.env.BUSINESS_NAME ?? 'PayNudge Billing',
        senderProfile: senderProfileWithFallback
      })
    : null;

  const toneSummary = Array.from(
    new Set(rulesSafe.map((rule) => rule.tone))
  ).map((tone) => tone.charAt(0).toUpperCase() + tone.slice(1));
  const offsets = rulesSafe.map((rule) => rule.days_offset);
  const timingSummary =
    offsets.length > 0
      ? `${Math.min(...offsets)} to ${Math.max(...offsets)} days from due date`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Track outstanding invoices and reminder activity.
          </p>
          <p className="mt-2 text-sm text-slate-600">{statusMessage}</p>
        </div>
        <div className="flex items-center gap-3">
          {preview ? (
            <Link href="#reminder-preview">
              <span className="inline-flex">
                <Button className="px-5 py-2.5 text-base">
                  Preview next reminder
                </Button>
              </span>
            </Link>
          ) : (
            <Button disabled className="px-5 py-2.5 text-base">
              Preview next reminder
            </Button>
          )}
        </div>
      </div>
      {pendingSetupItems.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <p className="font-semibold text-ink">Get started in 2 minutes</p>
          <div className="mt-3 space-y-3">
            {pendingSetupItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-start justify-between gap-4 rounded-md px-2 py-2 text-sm transition hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.helper}</p>
                </div>
                <span className="text-sm font-semibold text-ink">Go</span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Reminders are active. Next one sends {nextReminderText ?? 'soon'}.
        </p>
      )}
      <DashboardBillingBanner
        subscription_status={billingProfile?.subscription_status ?? null}
        trial_ends_at={billingProfile?.trial_ends_at ?? null}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Total outstanding">
          <p className="text-2xl font-semibold">
            {formatGBP(totalOutstanding)}
          </p>
          <p className="text-sm text-slate-500">
            {outstandingInvoices.length} invoices awaiting payment
          </p>
          {!hasInvoices ? (
            <Link
              href="/app/invoices"
              className="mt-2 inline-flex text-sm text-slate-500 hover:text-ink"
            >
              No invoices yet? Add your first invoice →
            </Link>
          ) : null}
        </Card>
        <Card title="Overdue invoices">
          <p className="text-2xl font-semibold">{overdueCount}</p>
          <p className="text-sm text-slate-500">Past due and unpaid</p>
        </Card>
        <Card title="Reminder activity">
          <p className="text-2xl font-semibold">{rulesSafe.length}</p>
          <p className="text-sm text-slate-500">
            {rulesSafe.length === 0
              ? 'No reminder rules yet'
              : `${toneSummary.join(' - ')} - ${timingSummary}`}
          </p>
        </Card>
      </div>

      <Card title="Reminder preview">
        <p className="text-xs text-slate-500">
          This preview shows the exact email your client will receive.
        </p>
        <Link
          href="/app/account"
          className="mt-2 inline-flex text-xs text-slate-500 hover:text-ink"
        >
          Want to change how this looks? Edit your email signature →
        </Link>
        <div
          id="reminder-preview"
          className="mt-3 space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            This is the email your client will receive
          </p>
          <div className="text-sm font-semibold text-slate-700">
            {previewToneCopy}
          </div>
          {preview ? (
            <>
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Email details
                </p>
                <div className="mt-3 space-y-3 text-slate-600">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Subject
                    </span>
                    <span className="mt-1 block text-base font-semibold text-ink">
                      {preview.subject}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Recipient
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {previewClient?.name ?? 'Client'} (client email)
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Invoice
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {previewInvoice?.invoice_number}
                    </span>
                  </div>
                </div>
              </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 whitespace-pre-line">
                {preview.text}
              </div>
              <p className="text-xs text-slate-500">
                This reminder is timed to avoid awkward follow-ups while keeping payment on track.
              </p>
            </>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Add your first invoice to preview the reminder email that will be
              sent.
            </div>
          )}
        </div>
      </Card>

      <Card title="Invoices">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Invoice</th>
                <th>Client</th>
                <th>Due date</th>
                <th>Status</th>
                <th>Last reminder</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    <span className="block">
                      Add your first invoice to start automated reminders.
                    </span>
                    <Link className="mt-2 inline-flex text-sm text-accent" href="/app/invoices">
                      Add an invoice
                    </Link>
                  </td>
                </tr>
              ) : (
                rows.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-slate-100">
                    <td className="py-3 font-medium">
                      {invoice.invoice_number}
                    </td>
                    <td className="text-slate-600">
                      {getClientName(invoice) ?? 'Client'}
                    </td>
                    <td>{formatDate(invoice.due_date)}</td>
                    <td className="capitalize">{invoice.status}</td>
                    <td>
                      {invoice.lastReminder
                        ? formatDate(invoice.lastReminder)
                        : 'No reminder yet'}
                    </td>
                    <td className="text-right">
                      {formatGBP(invoice.amount_pennies)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
