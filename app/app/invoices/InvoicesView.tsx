'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { addDays, isBefore, startOfDay } from 'date-fns';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HelperText } from '@/components/ui/HelperText';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { InvoiceForm } from '@/components/forms/InvoiceForm';
import {
  deleteInvoiceAction,
  markInvoicePaidAction,
  updateInvoiceAction
} from '@/app/app/invoices/actions';
import { formatDate, formatGBP } from '@/lib/format';
import { defaultEmailTemplates } from '@/lib/email/templates';
import { renderReminderContent, SenderProfile } from '@/lib/email/renderReminder';

type ClientOption = {
  id: string;
  name: string;
  email: string;
};

type ReminderRule = {
  days_offset: number;
  tone: 'friendly' | 'neutral' | 'firm';
};

type InvoiceRecord = {
  id: string;
  invoice_number: string;
  amount_pennies: number;
  due_date: string;
  issue_date: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
  paid_at: string | null;
  created_at: string;
  client_id: string;
  clients: { name: string; email: string } | null;
  reminders?: { sent_at: string | null }[] | null;
};

type TabKey = 'details' | 'add';

type StatusFilter = 'all' | 'draft' | 'sent' | 'paid';
type DueFilter = 'all' | 'due-soon' | 'overdue';
type SortKey = 'due' | 'amount' | 'recent';

type InvoicesViewProps = {
  clients: ClientOption[];
  initialInvoices: InvoiceRecord[];
  rules: ReminderRule[];
  senderProfile?: SenderProfile | null;
};

const normalizeInvoice = (
  invoice: any,
  reminders?: InvoiceRecord['reminders']
): InvoiceRecord => {
  const clients = Array.isArray(invoice.clients)
    ? invoice.clients[0] ?? null
    : invoice.clients ?? null;

  return {
    ...invoice,
    clients,
    reminders: reminders ?? invoice.reminders
  };
};

const statusStyles: Record<string, string> = {
  paid: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-700',
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-700',
  void: 'bg-slate-100 text-slate-500'
};

export function InvoicesView({
  clients,
  initialInvoices,
  rules,
  senderProfile
}: InvoicesViewProps) {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialInvoices[0]?.id ?? null
  );
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('due');
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    clientId: '',
    invoiceNumber: '',
    amount: 0,
    issueDate: '',
    dueDate: '',
    status: 'sent' as InvoiceRecord['status']
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const today = useMemo(() => startOfDay(new Date()), []);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedId) ?? null,
    [invoices, selectedId]
  );

  useEffect(() => {
    if (invoices.length === 0) {
      setSelectedId(null);
      setActiveTab('details');
      return;
    }
    if (selectedId && invoices.some((invoice) => invoice.id === selectedId)) {
      return;
    }
    setSelectedId(invoices[0].id);
  }, [invoices, selectedId]);

  useEffect(() => {
    if (!selectedInvoice) {
      setIsEditing(false);
      return;
    }
    setEditValues({
      clientId: selectedInvoice.client_id,
      invoiceNumber: selectedInvoice.invoice_number,
      amount: selectedInvoice.amount_pennies / 100,
      issueDate: selectedInvoice.issue_date,
      dueDate: selectedInvoice.due_date,
      status: selectedInvoice.status
    });
    setIsEditing(false);
  }, [selectedInvoice?.id]);

  const rulesSorted = useMemo(
    () => [...rules].sort((a, b) => a.days_offset - b.days_offset),
    [rules]
  );

  const remindersByInvoice = useMemo(() => {
    return invoices.reduce<Record<string, { next: Date | null; last: Date | null }>>(
      (acc, invoice) => {
        const dueDate = startOfDay(new Date(invoice.due_date));
        const isOutstanding = invoice.status === 'sent' && !invoice.paid_at;
        const next = isOutstanding
          ? rulesSorted
              .map((rule) => addDays(dueDate, rule.days_offset))
              .filter((date) => !isBefore(date, today))
              .reduce<Date | null>((closest, date) => {
                if (!closest || date.getTime() < closest.getTime()) {
                  return date;
                }
                return closest;
              }, null)
          : null;

        const last = (invoice.reminders ?? [])
          .map((reminder) => (reminder.sent_at ? new Date(reminder.sent_at) : null))
          .filter((date): date is Date => date !== null)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

        acc[invoice.id] = { next, last };
        return acc;
      },
      {}
    );
  }, [invoices, rulesSorted, today]);

  const outstandingTotal = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status === 'sent' && !invoice.paid_at)
      .reduce((sum, invoice) => sum + (invoice.amount_pennies ?? 0), 0);
  }, [invoices]);

  const overdueCount = useMemo(() => {
    return invoices.filter((invoice) => {
      if (invoice.status !== 'sent' || invoice.paid_at) return false;
      const dueDate = startOfDay(new Date(invoice.due_date));
      return isBefore(dueDate, today);
    }).length;
  }, [invoices, today]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    const dueSoonLimit = addDays(today, 7);

    const filtered = invoices.filter((invoice) => {
      const isOutstanding = invoice.status === 'sent' && !invoice.paid_at;
      const dueDate = startOfDay(new Date(invoice.due_date));
      const matchesSearch = query
        ? [
            invoice.invoice_number,
            invoice.clients?.name ?? '',
            invoice.clients?.email ?? ''
          ]
            .join(' ')
            .toLowerCase()
            .includes(query)
        : true;

      const matchesStatus =
        statusFilter === 'all' ? true : invoice.status === statusFilter;

      const matchesDue =
        dueFilter === 'all'
          ? true
          : dueFilter === 'overdue'
            ? isOutstanding && isBefore(dueDate, today)
            : dueFilter === 'due-soon'
              ? isOutstanding && !isBefore(dueDate, today) && !isBefore(dueSoonLimit, dueDate)
              : true;

      return matchesSearch && matchesStatus && matchesDue;
    });

    return filtered.sort((a, b) => {
      if (sortKey === 'amount') {
        return b.amount_pennies - a.amount_pennies;
      }
      if (sortKey === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [invoices, search, statusFilter, dueFilter, sortKey, today]);

  const handleSave = () => {
    if (!selectedInvoice) return;
    startTransition(async () => {
      const result = await updateInvoiceAction({
        id: selectedInvoice.id,
        clientId: editValues.clientId,
        invoiceNumber: editValues.invoiceNumber,
        amount: editValues.amount,
        issueDate: editValues.issueDate,
        dueDate: editValues.dueDate,
        status: editValues.status
      });
      if (result.error) {
        return;
      }
      if (result.invoice) {
        setInvoices((prev) =>
          prev.map((invoice) =>
            invoice.id === result.invoice.id
              ? normalizeInvoice(result.invoice, invoice.reminders)
              : invoice
          )
        );
        setIsEditing(false);
      }
    });
  };

  const handleDelete = () => {
    if (!selectedInvoice) return;
    startTransition(async () => {
      const result = await deleteInvoiceAction(selectedInvoice.id);
      if (result.error) {
        return;
      }
      setInvoices((prev) =>
        prev.filter((invoice) => invoice.id !== selectedInvoice.id)
      );
      setShowDeleteConfirm(false);
    });
  };

  const handleMarkPaid = (invoiceId: string) => {
    startTransition(async () => {
      const result = await markInvoicePaidAction({ invoiceId });
      if (result.error) {
        return;
      }
      setInvoices((prev) =>
        prev.map((invoice) => {
          if (invoice.id !== invoiceId) return invoice;
          return {
            ...invoice,
            status: 'paid',
            paid_at: new Date().toISOString()
          };
        })
      );
      setToast('Invoice marked as paid.');
      setTimeout(() => setToast(null), 3000);
    });
  };

  const previewRule = rulesSorted[0] ?? null;
  const previewTemplate = previewRule
    ? defaultEmailTemplates[previewRule.tone]
    : defaultEmailTemplates.friendly;
  const previewEmail =
    selectedInvoice && previewRule
      ? renderReminderContent({
          templateSubject: previewTemplate.subject,
          templateBody: previewTemplate.body,
          tone: previewRule.tone,
          daysOffset: previewRule.days_offset,
          clientName: selectedInvoice.clients?.name ?? 'Client',
          invoiceNumber: selectedInvoice.invoice_number,
          amount: formatGBP(selectedInvoice.amount_pennies),
          dueDate: formatDate(selectedInvoice.due_date),
          issueDate: formatDate(selectedInvoice.issue_date),
          businessName: 'PayNudge Billing',
          senderProfile
        })
      : null;
  const hasReminderPreview = !!previewRule && !!previewEmail;
  const previewTimingLabel = previewRule
    ? previewRule.days_offset === 0
      ? 'On the due date'
      : previewRule.days_offset < 0
        ? `${Math.abs(previewRule.days_offset)} days before due date`
        : `${previewRule.days_offset} days after due date`
    : null;

  const statusBadge = (invoice: InvoiceRecord) => {
    const dueDate = startOfDay(new Date(invoice.due_date));
    const isOverdue =
      invoice.status === 'sent' && !invoice.paid_at && isBefore(dueDate, today);
    const label = isOverdue ? 'overdue' : invoice.status;
    return (
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[label] ?? statusStyles.draft}`}
      >
        {label}
      </span>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card title="Invoices">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Input
              placeholder="Search invoice #, client..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-slate-400">
                Sort
              </span>
              <Select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
              >
                <option value="due">Due date (soonest)</option>
                <option value="amount">Amount (highest)</option>
                <option value="recent">Recently created</option>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'draft', 'sent', 'paid'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold transition',
                  statusFilter === status
                    ? 'bg-ink text-white'
                    : 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-ink'
                ].join(' ')}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
            <div className="h-4 w-px bg-slate-200" />
            {(['all', 'due-soon', 'overdue'] as DueFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setDueFilter(filter)}
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold transition',
                  dueFilter === filter
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-ink'
                ].join(' ')}
              >
                {filter === 'all'
                  ? 'All due'
                  : filter === 'due-soon'
                    ? 'Due soon'
                    : 'Overdue'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Outstanding {formatGBP(outstandingTotal)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Overdue {overdueCount}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Next reminder</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      No invoices yet.
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      {dueFilter === 'overdue'
                        ? 'No overdue invoices yet.'
                        : 'No invoices match your filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const reminderInfo = remindersByInvoice[invoice.id];
                    const isSelected = invoice.id === selectedId;
                    return (
                      <tr
                        key={invoice.id}
                        onClick={() => {
                          setSelectedId(invoice.id);
                          setActiveTab('details');
                        }}
                        className={[
                          'border-t border-slate-100 transition hover:bg-slate-50',
                          'cursor-pointer',
                          isSelected ? 'bg-slate-50 border-l-4 border-l-ink' : ''
                        ].join(' ')}
                      >
                        <td className="px-4 py-4 font-semibold text-ink">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          <div className="font-medium text-slate-700">
                            {invoice.clients?.name ?? 'Client'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {invoice.clients?.email ?? 'No email'}
                          </div>
                        </td>
                        <td className="px-4 py-4">{formatDate(invoice.due_date)}</td>
                        <td className="px-4 py-4">{statusBadge(invoice)}</td>
                        <td className="px-4 py-4 text-right font-semibold text-ink">
                          {formatGBP(invoice.amount_pennies)}
                        </td>
                        <td className="px-4 py-4 text-slate-500">
                          {reminderInfo?.next ? formatDate(reminderInfo.next) : ''}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-1">
            <button
              type="button"
              className={[
                'flex-1 rounded-md px-3 py-2 text-sm font-semibold transition',
                activeTab === 'details'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-slate-500 hover:text-ink'
              ].join(' ')}
              onClick={() => setActiveTab('details')}
            >
              Invoice details
            </button>
            <button
              type="button"
              className={[
                'flex-1 rounded-md px-3 py-2 text-sm font-semibold transition',
                activeTab === 'add'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-slate-500 hover:text-ink'
              ].join(' ')}
              onClick={() => setActiveTab('add')}
            >
              Add invoice
            </button>
          </div>

          {activeTab === 'details' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Invoice details</h2>
                  <p className="text-sm text-slate-500">
                    Track reminder timing and payment status.
                  </p>
                </div>
              </div>

              {selectedInvoice ? (
                <div className="space-y-4 rounded-lg border border-slate-100 bg-white p-4">
                  <div className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          {selectedInvoice.clients?.name ?? 'Client'}
                        </p>
                        <h3 className="text-xl font-semibold text-ink">
                          {selectedInvoice.invoice_number}
                        </h3>
                      </div>
                      <div>{statusBadge(selectedInvoice)}</div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        Amount
                      </p>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editValues.amount}
                          onChange={(event) =>
                            setEditValues((prev) => ({
                              ...prev,
                              amount: Number(event.target.value)
                            }))
                          }
                        />
                      ) : (
                        <p className="text-2xl font-semibold text-ink">
                          {formatGBP(selectedInvoice.amount_pennies)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        Dates
                      </p>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            type="date"
                            value={editValues.issueDate}
                            onChange={(event) =>
                              setEditValues((prev) => ({
                                ...prev,
                                issueDate: event.target.value
                              }))
                            }
                          />
                          <Input
                            type="date"
                            value={editValues.dueDate}
                            onChange={(event) =>
                              setEditValues((prev) => ({
                                ...prev,
                                dueDate: event.target.value
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-slate-600">
                          <p>Issue: {formatDate(selectedInvoice.issue_date)}</p>
                          <p>Due: {formatDate(selectedInvoice.due_date)}</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        Client
                      </p>
                      {isEditing ? (
                        <Select
                          value={editValues.clientId}
                          onChange={(event) =>
                            setEditValues((prev) => ({
                              ...prev,
                              clientId: event.target.value
                            }))
                          }
                        >
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name} ({client.email})
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <div className="text-sm text-slate-600">
                          <p className="font-semibold text-ink">
                            {selectedInvoice.clients?.name ?? 'Client'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {selectedInvoice.clients?.email ?? 'No email on file'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-ink">
                          Reminder schedule
                        </h4>
                        <p className="text-xs text-slate-500">
                          Stay aligned with your reminder tone and cadence.
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {previewRule
                          ? previewRule.tone.charAt(0).toUpperCase() +
                            previewRule.tone.slice(1)
                          : 'Friendly'}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Last reminder sent
                        </p>
                        <p className="text-sm text-slate-600">
                          {remindersByInvoice[selectedInvoice.id]?.last
                            ? formatDate(remindersByInvoice[selectedInvoice.id].last as Date)
                            : 'No reminders sent yet'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Next reminder
                        </p>
                        <p className="text-sm text-slate-600">
                          {selectedInvoice.status === 'paid'
                            ? 'No more reminders'
                            : remindersByInvoice[selectedInvoice.id]?.next
                              ? formatDate(remindersByInvoice[selectedInvoice.id].next as Date)
                              : 'Next reminder will be scheduled soon'}
                        </p>
                      </div>
                    </div>
                    {selectedInvoice.status === 'paid' ? (
                      <p className="text-xs text-slate-500">
                        No further reminders will be sent for this invoice.
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Actions
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsPreviewOpen(true)}
                        disabled={!hasReminderPreview}
                      >
                        Preview reminder for this invoice
                      </Button>
                      {selectedInvoice.status !== 'paid' ? (
                        <Button
                          type="button"
                          onClick={() => handleMarkPaid(selectedInvoice.id)}
                          disabled={isPending}
                        >
                          Mark as paid
                        </Button>
                      ) : (
                        <span className="text-sm text-slate-500">
                          Payment complete. No reminder actions needed.
                        </span>
                      )}
                      {isEditing ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsEditing(false)}
                            disabled={isPending}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={handleSave}
                            disabled={isPending}
                          >
                            {isPending ? 'Saving...' : 'Save'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsEditing(true)}
                          >
                            Edit invoice
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowDeleteConfirm(true)}
                          >
                          Delete
                        </Button>
                      </>
                    )}
                    </div>
                    {!hasReminderPreview ? (
                      <HelperText>
                        Add a reminder rule to preview the email.
                      </HelperText>
                    ) : null}
                  </div>

                  {previewEmail ? (
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-ink">
                          Reminder email preview
                        </h4>
                        <p className="text-xs text-slate-500">
                          Based on your next enabled reminder rule.
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Subject
                        </p>
                        <p className="mt-2 font-semibold text-ink">
                          {previewEmail.subject}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 whitespace-pre-line">
                        {previewEmail.text}
                      </div>
                    </div>
                  ) : (
                    <HelperText>
                      Set a reminder rule to preview your email template.
                    </HelperText>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                  <p className="text-sm font-semibold text-ink">
                    Select an invoice to view details
                  </p>
                  <p className="text-sm text-slate-500">
                    Or add a new invoice to get started.
                  </p>
                  <Button
                    type="button"
                    className="mt-4"
                    onClick={() => setActiveTab('add')}
                  >
                    Add invoice
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Add invoice</h2>
                <p className="text-sm text-slate-500">
                  Create and send in just a few steps.
                </p>
              </div>
              {clients.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Add a client before creating invoices.
                </p>
              ) : (
                <InvoiceForm
                  clients={clients}
                  onCreated={(invoice) => {
                    const normalized = normalizeInvoice(invoice);
                    setInvoices((prev) => [normalized, ...prev]);
                    setSelectedId(normalized.id);
                    setActiveTab('details');
                  }}
                />
              )}
            </div>
          )}

          {toast ? (
            <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
              {toast}
            </div>
          ) : null}
        </div>
      </Card>

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-ink">Delete invoice</h3>
            <p className="mt-2 text-sm text-slate-500">
              This permanently removes the invoice and its reminder schedule.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleDelete} disabled={isPending}>
                {isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isPreviewOpen && previewRule && previewEmail && selectedInvoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-ink">
                  Reminder preview
                </h3>
                <p className="text-sm text-slate-500">
                  This is exactly what your client will receive.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsPreviewOpen(false)}
              >
                Close
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {previewRule.tone.charAt(0).toUpperCase() +
                    previewRule.tone.slice(1)}
                </span>
                <span>{previewTimingLabel}</span>
              </div>

              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Recipient
                  </p>
                  <p className="mt-1 font-semibold text-ink">
                    {selectedInvoice.clients?.name ?? 'Client'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedInvoice.clients?.email ?? 'client email'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Invoice
                  </p>
                  <p className="mt-1 font-semibold text-ink">
                    {selectedInvoice.invoice_number}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatGBP(selectedInvoice.amount_pennies)} - Due{' '}
                    {formatDate(selectedInvoice.due_date)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Subject
                </p>
                <p className="mt-2 text-base font-semibold text-ink">
                  {previewEmail.subject}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 whitespace-pre-line">
                {previewEmail.text}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
