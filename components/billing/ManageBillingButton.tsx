'use client';

import { useState, useTransition } from 'react';


export function ManageBillingButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch('/api/stripe/create-portal-session', {
          method: 'POST'
        });
        const data = await response.json();
        if (!response.ok || !data.url) {
          setError('Unable to open billing portal.');
          return;
        }
        window.location.href = data.url;
      } catch (err) {
        setError('Unable to open billing portal.');
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-sm text-slate-600 transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Opening...' : 'Manage billing'}
      </button>
      {error ? <p className="mt-2 text-xs text-slate-500">{error}</p> : null}
    </div>
  );
}
