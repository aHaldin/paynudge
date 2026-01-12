'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { clientSchema } from '@/lib/validation';

export async function createClientAction(data: {
  name: string;
  email: string;
  companyName?: string;
  notes?: string;
}) {
  const values = clientSchema.safeParse(data);
  if (!values.success) {
    return { error: values.error.flatten().fieldErrors };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      user_id: user?.id,
      name: values.data.name,
      email: values.data.email,
      company_name: values.data.companyName ?? null,
      notes: values.data.notes ?? null
    })
    .select('*')
    .single();

  if (error) {
    return { error: { form: [error.message] } };
  }

  revalidatePath('/app/clients');
  return { error: null, client };
}

export async function updateClientAction(data: {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  notes?: string;
}) {
  const values = clientSchema.safeParse({
    name: data.name,
    email: data.email,
    companyName: data.companyName,
    notes: data.notes
  });

  if (!values.success) {
    return { error: values.error.flatten().fieldErrors };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: client, error } = await supabase
    .from('clients')
    .update({
      name: values.data.name,
      email: values.data.email,
      company_name: values.data.companyName ?? null,
      notes: values.data.notes ?? null
    })
    .eq('id', data.id)
    .eq('user_id', user?.id ?? '')
    .select('*')
    .single();

  if (error) {
    return { error: { form: [error.message] } };
  }

  revalidatePath('/app/clients');
  return { error: null, client };
}

export async function deleteClientAction(id: string) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', user?.id ?? '');

  if (error) {
    return { error: { form: [error.message] } };
  }

  revalidatePath('/app/clients');
  return { error: null };
}
