'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { accountSettingsSchema } from '@/lib/validation';

export async function saveAccountSettingsAction(data: {
  senderName?: string;
  replyToEmail?: string;
  emailSignature?: string;
}) {
  const values = accountSettingsSchema.safeParse(data);
  if (!values.success) {
    return { error: values.error.flatten().fieldErrors };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: { form: ['You must be signed in.'] } };
  }

  const { data: saved, error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      sender_name: values.data.senderName ?? null,
      reply_to_email: values.data.replyToEmail ?? null,
      email_signature: values.data.emailSignature ?? null
    },
    { onConflict: 'id' }
  )
    .select('*')
    .single();

  if (error) {
    return { error: { form: [error.message] } };
  }

  revalidatePath('/app/account');
  return { error: null, settings: saved };
}

export async function deleteAccountAction() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be signed in.' };
  }

  await supabase.from('reminders').delete().eq('user_id', user.id);
  await supabase.from('invoices').delete().eq('user_id', user.id);
  await supabase.from('reminder_rules').delete().eq('user_id', user.id);
  await supabase.from('reminder_templates').delete().eq('user_id', user.id);
  await supabase.from('clients').delete().eq('user_id', user.id);
  await supabase.from('profiles').delete().eq('id', user.id);

  await supabase.auth.signOut();
  revalidatePath('/');
  redirect('/login');
}
