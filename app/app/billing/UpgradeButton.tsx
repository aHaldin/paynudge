'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';

export function UpgradeButton() {
  const [isPending, startTransition] = useTransition();
  if (process.env.NEXT_PUBLIC_BILLING_ENABLED !== 'true') {
    return null;
  }

  const handleUpgrade = () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST'
        });
        const data = await response.json();
        if (!response.ok || !data.url) {
          return;
        }
        window.location.href = data.url;
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={isPending}
        className="text-sm font-semibold text-ink transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Redirecting...' : 'Upgrade to PayNudge'}
      </button>
    </div>
  );
}
