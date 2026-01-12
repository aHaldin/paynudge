'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loginSchema, signupSchema } from '@/lib/validation';

export async function signInWithEmail(data: {
  email: string;
  password: string;
}) {
  const values = loginSchema.safeParse(data);
  if (!values.success) {
    return { error: values.error.flatten().fieldErrors };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: values.data.email,
    password: values.data.password
  });

  if (error) {
    return { error: { form: [error.message] } };
  }

  revalidatePath('/app');
  return { error: null };
}

export async function signUpWithEmail(data: {
  fullName: string;
  email: string;
  password: string;
}) {
  const values = signupSchema.safeParse(data);
  if (!values.success) {
    return { error: values.error.flatten().fieldErrors };
  }

  const supabase = createSupabaseServerClient();
  const { data: authData, error } = await supabase.auth.signUp({
    email: values.data.email,
    password: values.data.password
  });

  if (error) {
    return { error: { form: [error.message] } };
  }

  if (authData.user) {
    const now = new Date();
    const endsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    await supabase.from('profiles').insert({
      id: authData.user.id,
      user_id: authData.user.id,
      full_name: values.data.fullName,
      trial_ends_at: endsAt.toISOString(),
      has_access: true
    });
  }

  revalidatePath('/app');
  return { error: null };
}

export async function signOut() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/');
  redirect('/login');
}
