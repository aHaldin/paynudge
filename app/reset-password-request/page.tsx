'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { HelperText } from '@/components/ui/HelperText';
import { Input } from '@/components/ui/Input';
import { MarketingNavbar } from '@/components/navigation/MarketingNavbar';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const supabase = createSupabaseBrowserClient();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`
        }
      );

      if (resetError) {
        setError(resetError.message ?? 'Unable to send reset link.');
        return;
      }

      setMessage(
        "If an account exists for this email, you'll receive a reset link shortly."
      );
    });
  };

  return (
    <main className="min-h-screen bg-white">
      <MarketingNavbar />
      <div className="mx-auto flex max-w-2xl flex-col px-6 py-12 md:py-16">
        <h1 className="text-3xl font-semibold text-ink">Reset your password</h1>
        <p className="mt-3 text-sm text-slate-600">
          Enter your email and we'll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          {error ? <HelperText tone="error">{error}</HelperText> : null}
          {message ? <HelperText>{message}</HelperText> : null}

          <Button type="submit" disabled={isPending}>
            {isPending ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>

        <Link
          href="/login"
          className="mt-4 text-sm text-slate-500 hover:underline"
        >
          Back to login
        </Link>
      </div>
    </main>
  );
}
