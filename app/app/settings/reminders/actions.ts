'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { reminderRuleSchema, reminderTemplateSchema } from '@/lib/validation';

export async function createReminderRuleAction(data: {
  daysOffset: number;
  tone: 'friendly' | 'neutral' | 'firm';
  enabled: boolean;
}) {
  const values = reminderRuleSchema.safeParse(data);
  if (!values.success) {
    return { error: values.error.flatten().fieldErrors };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('reminder_rules').insert({
    user_id: user?.id,
    days_offset: values.data.daysOffset,
    tone: values.data.tone,
    enabled: values.data.enabled
  });

  if (error) {
    return { error: { form: [error.message] } };
  }

  revalidatePath('/app/settings/reminders');
  return { error: null };
}

const reminderRuleUpdateSchema = reminderRuleSchema.pick({
  daysOffset: true,
  enabled: true
});

export async function updateReminderRuleAction(data: {
  id: string;
  daysOffset: number;
  enabled: boolean;
}) {
  const values = reminderRuleUpdateSchema.safeParse({
    daysOffset: data.daysOffset,
    enabled: data.enabled
  });

  if (!values.success) {
    return { error: values.error.flatten().fieldErrors };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('reminder_rules')
    .update({
      days_offset: values.data.daysOffset,
      enabled: values.data.enabled
    })
    .eq('id', data.id)
    .eq('user_id', user?.id ?? '');

  if (error) {
    return { error: { form: [error.message] } };
  }

  revalidatePath('/app/settings/reminders');
  return { error: null };
}

export async function deleteReminderRuleAction(id: string) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const nowIso = new Date().toISOString();
  await supabase
    .from('reminders')
    .delete()
    .eq('rule_id', id)
    .eq('user_id', user?.id ?? '')
    .or(`sent_at.is.null,sent_at.gt.${nowIso}`);

  const { error } = await supabase
    .from('reminder_rules')
    .delete()
    .eq('id', id)
    .eq('user_id', user?.id ?? '');

  if (error) {
    return { error: { form: [error.message] } };
  }

  revalidatePath('/app/settings/reminders');
  return { error: null };
}

export async function saveReminderTemplateAction(data: {
  tone: 'friendly' | 'neutral' | 'firm';
  subject: string;
  body: string;
}) {
  const values = reminderTemplateSchema.safeParse(data);
  if (!values.success) {
    return { error: values.error.flatten().fieldErrors };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('reminder_templates').upsert(
    {
      user_id: user?.id,
      tone: values.data.tone,
      subject: values.data.subject,
      body: values.data.body,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id,tone' }
  );

  if (error) {
    return { error: { form: [error.message] } };
  }

  revalidatePath('/app/settings/reminders');
  return { error: null };
}
