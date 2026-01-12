import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function BillingSuccessPage() {
  return (
    <div className="space-y-6">
      <Card title="Subscription active">
        <p className="text-sm text-slate-600">
          Your subscription is active. Reminders will continue as scheduled.
        </p>
        <div className="mt-4">
          <Link href="/app">
            <Button>Go to dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
