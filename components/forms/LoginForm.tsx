'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { loginSchema, signupSchema } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { HelperText } from '@/components/ui/HelperText';
import { Input } from '@/components/ui/Input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';

const modes = ['login', 'signup'] as const;

type LoginValues = {
  email: string;
  password: string;
};

type SignupValues = LoginValues & {
  fullName: string;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<(typeof modes)[number]>('login');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const supabase = createSupabaseBrowserClient();

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '' }
  });

  useEffect(() => {
    const requested = searchParams.get('mode');
    if (requested === 'signup' || requested === 'login') {
      setMode(requested);
    }
  }, [searchParams]);

  const handleLogin = loginForm.handleSubmit((values) => {
    setFormError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password
      });

      if (error) {
        setFormError(error.message ?? 'Unable to sign in');
        return;
      }
      router.push('/app');
      router.refresh();
    });
  });

  const handleSignup = signupForm.handleSubmit((values) => {
    setFormError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: { full_name: values.fullName } }
      });

      if (error) {
        setFormError(error.message ?? 'Unable to sign up');
        return;
      }

      if (data.session) {
        router.push('/app');
        router.refresh();
        return;
      }

      setSuccessMessage('Check your email to confirm your account.');
    });
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
        {modes.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-full px-4 py-1 text-sm font-semibold capitalize transition ${
              mode === value
                ? 'bg-white text-ink shadow-sm'
                : 'text-slate-500 hover:text-ink'
            }`}
          >
            {value === 'login' ? 'Log in' : 'Sign up'}
          </button>
        ))}
      </div>

      {formError ? <HelperText tone="error">{formError}</HelperText> : null}
      {successMessage ? <HelperText>{successMessage}</HelperText> : null}

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="mt-5 space-y-5">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              hasError={!!loginForm.formState.errors.email}
              {...loginForm.register('email')}
            />
            {loginForm.formState.errors.email ? (
              <HelperText tone="error">
                {loginForm.formState.errors.email.message}
              </HelperText>
            ) : null}
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              hasError={!!loginForm.formState.errors.password}
              {...loginForm.register('password')}
            />
            {loginForm.formState.errors.password ? (
              <HelperText tone="error">
                {loginForm.formState.errors.password.message}
              </HelperText>
            ) : null}
            <Link
              href="/reset-password-request"
              className="mt-2 inline-flex text-xs text-slate-500 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Signing in...' : 'Log in'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSignup} className="mt-5 space-y-5">
          <div>
            <label className="text-sm font-medium">Full name</label>
            <Input
              hasError={!!signupForm.formState.errors.fullName}
              {...signupForm.register('fullName')}
            />
            {signupForm.formState.errors.fullName ? (
              <HelperText tone="error">
                {signupForm.formState.errors.fullName.message}
              </HelperText>
            ) : null}
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              hasError={!!signupForm.formState.errors.email}
              {...signupForm.register('email')}
            />
            {signupForm.formState.errors.email ? (
              <HelperText tone="error">
                {signupForm.formState.errors.email.message}
              </HelperText>
            ) : null}
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              hasError={!!signupForm.formState.errors.password}
              {...signupForm.register('password')}
            />
            {signupForm.formState.errors.password ? (
              <HelperText tone="error">
                {signupForm.formState.errors.password.message}
              </HelperText>
            ) : null}
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Creating account...' : 'Start free — 14 days'}
          </Button>
        </form>
      )}
    </div>
  );
}
