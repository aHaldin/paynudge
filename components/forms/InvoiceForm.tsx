'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format as formatDate } from 'date-fns';

import { invoiceSchema } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { HelperText } from '@/components/ui/HelperText';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { createInvoiceAction } from '@/app/app/invoices/actions';
import { formatGBP } from '@/lib/format';

export type ClientOption = {
  id: string;
  name: string;
  email: string;
};

export type InvoiceFormValues = {
  clientId: string;
  invoiceNumber: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
  paymentTerms?: 'net7' | 'net14' | 'net30' | 'net60' | 'custom';
};

type InvoiceFormProps = {
  clients: ClientOption[];
  onCreated?: (invoice: {
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
  }) => void;
};

const normalizeInvoice = (invoice: any) => {
  const client = Array.isArray(invoice.clients)
    ? invoice.clients[0] ?? null
    : invoice.clients ?? null;
  return {
    ...invoice,
    clients: client
  };
};

export function InvoiceForm({ clients, onCreated }: InvoiceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isManualDueDate, setIsManualDueDate] = useState(false);
  const today = useMemo(() => formatDate(new Date(), 'yyyy-MM-dd'), []);
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: '',
      invoiceNumber: '',
      amount: 0,
      issueDate: today,
      dueDate: '',
      status: 'sent',
      paymentTerms: 'net14'
    }
  });

  const amountValue = Number(form.watch('amount')) || 0;
  const issueDate = form.watch('issueDate');
  const dueDate = form.watch('dueDate');
  const paymentTerms = form.watch('paymentTerms');

  useEffect(() => {
    if (clients.length > 0 && !form.getValues('clientId')) {
      form.setValue('clientId', clients[0].id, { shouldValidate: true });
    }
  }, [clients, form]);

  useEffect(() => {
    if (!issueDate || !paymentTerms || paymentTerms === 'custom') return;
    const days =
      paymentTerms === 'net7'
        ? 7
        : paymentTerms === 'net14'
          ? 14
          : paymentTerms === 'net30'
            ? 30
            : paymentTerms === 'net60'
              ? 60
              : null;
    if (!days) return;
    const nextDue = formatDate(addDays(new Date(issueDate), days), 'yyyy-MM-dd');
    if (nextDue !== dueDate) {
      form.setValue('dueDate', nextDue, { shouldValidate: true });
      setIsManualDueDate(false);
    }
  }, [issueDate, paymentTerms, dueDate, form]);

  useEffect(() => {
    if (paymentTerms === 'custom' && dueDate) {
      setIsManualDueDate(true);
    }
  }, [paymentTerms, dueDate]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createInvoiceAction(values);
      if (result.error) {
        const formError = (result.error as { form?: string[] }).form?.[0];
        form.setError('root', {
          message: formError ?? 'Unable to save invoice.'
        });
        return;
      }
      form.reset({
        clientId: '',
        invoiceNumber: '',
        amount: 0,
        issueDate: today,
        dueDate: '',
        status: 'sent',
        paymentTerms: 'net14'
      });
      setIsManualDueDate(false);
      if (result.invoice) {
        onCreated?.(normalizeInvoice(result.invoice));
      } else {
        router.refresh();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-ink">Client</label>
        <Select
          hasError={!!form.formState.errors.clientId}
          {...form.register('clientId')}
        >
          <option value="">Select a client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name} ({client.email})
            </option>
          ))}
        </Select>
        {form.formState.errors.clientId ? (
          <HelperText tone="error">
            {form.formState.errors.clientId.message}
          </HelperText>
        ) : null}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-ink">Invoice number</label>
        <Input
          hasError={!!form.formState.errors.invoiceNumber}
          {...form.register('invoiceNumber')}
        />
        {form.formState.errors.invoiceNumber ? (
          <HelperText tone="error">
            {form.formState.errors.invoiceNumber.message}
          </HelperText>
        ) : null}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-ink">Amount (GBP)</label>
        <div className="flex flex-wrap gap-2">
          {[50, 150, 300, 500].map((preset) => (
            <button
              key={preset}
              type="button"
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-ink"
              onClick={() =>
                form.setValue('amount', preset, { shouldValidate: true })
              }
            >
              {formatGBP(preset * 100)}
            </button>
          ))}
        </div>
        <Input
          type="number"
          step="0.01"
          hasError={!!form.formState.errors.amount}
          {...form.register('amount')}
        />
        {amountValue > 0 ? (
          <HelperText>Formatted: {formatGBP(amountValue * 100)}</HelperText>
        ) : null}
        {form.formState.errors.amount ? (
          <HelperText tone="error">
            {form.formState.errors.amount.message}
          </HelperText>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-ink">Issue date</label>
          <Input
            type="date"
            hasError={!!form.formState.errors.issueDate}
            {...form.register('issueDate')}
          />
          {form.formState.errors.issueDate ? (
            <HelperText tone="error">
              {form.formState.errors.issueDate.message}
            </HelperText>
          ) : null}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-ink">Due date</label>
          <Input
            type="date"
            hasError={!!form.formState.errors.dueDate}
            {...form.register('dueDate', {
              onChange: (event) => {
                form.setValue('dueDate', event.target.value, {
                  shouldValidate: true
                });
                form.setValue('paymentTerms', 'custom');
                setIsManualDueDate(true);
              }
            })}
          />
          {isManualDueDate ? <HelperText>Manual override</HelperText> : null}
          {form.formState.errors.dueDate ? (
            <HelperText tone="error">
              {form.formState.errors.dueDate.message}
            </HelperText>
          ) : null}
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-ink">Payment terms</label>
        <Select {...form.register('paymentTerms')}>
          <option value="net7">Net 7</option>
          <option value="net14">Net 14</option>
          <option value="net30">Net 30</option>
          <option value="net60">Net 60</option>
          <option value="custom">Custom</option>
        </Select>
        <HelperText>
          Due date will update automatically when you choose a net term.
        </HelperText>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-ink">Status</label>
        <Select
          hasError={!!form.formState.errors.status}
          {...form.register('status')}
        >
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="void">Void</option>
        </Select>
      </div>
      {form.formState.errors.root ? (
        <HelperText tone="error">{form.formState.errors.root.message}</HelperText>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Add Invoice'}
      </Button>
    </form>
  );
}
