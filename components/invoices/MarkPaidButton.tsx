'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { markInvoicePaidAction } from '@/app/app/invoices/actions';

export function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const confirmed = window.confirm(
      'Mark invoice as paid? This will stop all future reminders for this invoice.'
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await markInvoicePaidAction({ invoiceId });
      if (result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleClick}
      disabled={isPending}
      className="px-3 py-1 text-xs"
    >
      {isPending ? 'Updating...' : 'Mark paid'}
    </Button>
  );
}
