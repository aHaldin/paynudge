'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { HelperText } from '@/components/ui/HelperText';
import { Input } from '@/components/ui/Input';
import { MarketingNavbar } from '@/components/navigation/MarketingNavbar';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setError('This reset link is invalid or has expired.');
      }
    });
  }, [supabase]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    startTransition(async () => {
      const { error: updateError } = await supabase.auth.updateUser({
        password
      });

      if (updateError) {
        setError(updateError.message ?? 'Unable to update password.');
        return;
      }

      setMessage('Password updated. Redirecting to your dashboard...');
      setTimeout(() => {
        router.push('/app');
        router.refresh();
      }, 1500);
    });
  };

  return (
    <main className="min-h-screen bg-white">
      <MarketingNavbar />
      <div className="mx-auto flex max-w-2xl flex-col px-6 py-12 md:py-16">
        <h1 className="text-3xl font-semibold text-ink">Set a new password</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">New password</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Confirm password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          {error ? <HelperText tone="error">{error}</HelperText> : null}
          {message ? <HelperText>{message}</HelperText> : null}

          <Button type="submit" disabled={isPending}>
            {isPending ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </div>
    </main>
  );
}
