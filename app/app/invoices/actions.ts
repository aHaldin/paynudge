'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { invoiceSchema } from '@/lib/validation';

export async function createInvoiceAction(data: {
  clientId: string;
  invoiceNumber: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
}) {
  const values = invoiceSchema.safeParse(data);
  if (!values.success) {
    return { error: values.error.flatten().fieldErrors };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const paidAt = values.data.status === 'paid' ? new Date().toISOString() : null;

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      user_id: user?.id,
      client_id: values.data.clientId,
      invoice_number: values.data.invoiceNumber,
      currency: 'GBP',
      amount_pennies: Math.round(values.data.amount * 100),
      issue_date: values.data.issueDate,
      due_date: values.data.dueDate,
      status: values.data.status,
      paid_at: paidAt
    })
    .select(
      'id, invoice_number, amount_pennies, due_date, issue_date, status, paid_at, created_at, client_id, clients(name, email)'
    )
    .single();

  if (error) {
    return { error: { form: [error.message] } };
  }

  revalidatePath('/app/invoices');
  revalidatePath('/app');
  return { error: null, invoice };
}

export async function markInvoicePaidAction(data: { invoiceId: string }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: invoice, error: updateError } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', data.invoiceId)
    .eq('user_id', user?.id ?? '')
    .select(
      'id, invoice_number, amount_pennies, due_date, issue_date, status, paid_at, created_at, client_id, clients(name, email)'
    )
    .single();

  if (updateError) {
    return { error: updateError.message };
  }

  const nowIso = new Date().toISOString();
  await supabase
    .from('reminders')
    .delete()
    .eq('invoice_id', data.invoiceId)
    .or(`sent_at.is.null,sent_at.gt.${nowIso}`);

  revalidatePath('/app/invoices');
  revalidatePath('/app');
  return { error: null, invoice };
}

export async function updateInvoiceAction(data: {
  id: string;
  clientId: string;
  invoiceNumber: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
}) {
  const values = invoiceSchema.safeParse({
    clientId: data.clientId,
    invoiceNumber: data.invoiceNumber,
    amount: data.amount,
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    status: data.status
  });

  if (!values.success) {
    return { error: values.error.flatten().fieldErrors };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const paidAt = values.data.status === 'paid' ? new Date().toISOString() : null;

  const { data: invoice, error } = await supabase
    .from('invoices')
    .update({
      client_id: values.data.clientId,
      invoice_number: values.data.invoiceNumber,
      amount_pennies: Math.round(values.data.amount * 100),
      issue_date: values.data.issueDate,
      due_date: values.data.dueDate,
      status: values.data.status,
      paid_at: paidAt
    })
    .eq('id', data.id)
    .eq('user_id', user?.id ?? '')
    .select(
      'id, invoice_number, amount_pennies, due_date, issue_date, status, paid_at, created_at, client_id, clients(name, email)'
    )
    .single();

  if (error) {
    return { error: { form: [error.message] } };
  }

  if (values.data.status === 'paid') {
    const nowIso = new Date().toISOString();
    await supabase
      .from('reminders')
      .delete()
      .eq('invoice_id', data.id)
      .or(`sent_at.is.null,sent_at.gt.${nowIso}`);
  }

  revalidatePath('/app/invoices');
  revalidatePath('/app');
  return { error: null, invoice };
}

export async function deleteInvoiceAction(id: string) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('user_id', user?.id ?? '');

  if (error) {
    return { error: { form: [error.message] } };
  }

  revalidatePath('/app/invoices');
  revalidatePath('/app');
  return { error: null };
}
