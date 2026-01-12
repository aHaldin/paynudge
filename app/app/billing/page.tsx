import { Card } from '@/components/ui/Card';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { UpgradeButton } from '@/app/app/billing/UpgradeButton';
import { ManageBillingButton } from '@/components/billing/ManageBillingButton';
import {
  daysLeft,
  hasAccess,
  isSubscriptionActive,
  isTrialActive,
  isTrialExpired
} from '@/lib/billing/access';

type BillingPageProps = {
  searchParams?: { success?: string };
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at')
    .eq('id', user?.id ?? '')
    .maybeSingle();

  const subscribed = isSubscriptionActive(profile);
  const trialActive = isTrialActive(profile);
  const trialExpired = isTrialExpired(profile);
  const access = hasAccess(profile);

  if (process.env.NEXT_PUBLIC_BILLING_ENABLED !== 'true') {
    return (
      <div className="space-y-6">
        <Card title="Billing status">
          <div className="space-y-3 text-sm text-slate-600">
            <p>Billing is disabled for this environment.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Billing status">
        <div className="space-y-3 text-sm text-slate-600">
          {searchParams?.success === '1' ? (
            <p className="text-green-600">Payment setup complete.</p>
          ) : null}
          {subscribed ? (
            <p>Your subscription is active.</p>
          ) : trialActive ? (
            <p>Free trial: {daysLeft(profile)} days remaining.</p>
          ) : trialExpired ? (
            <p className="text-rose-700">
              Trial ended — upgrade to keep sending reminders.
            </p>
          ) : (
            <p>Free trial active.</p>
          )}
          {!subscribed ? (
            <div className="pt-2">
              <UpgradeButton />
            </div>
          ) : null}
          {subscribed ? (
            <div className="pt-2">
              <ManageBillingButton />
            </div>
          ) : null}
          {!access ? (
            <p className="text-xs text-slate-500">
              Access is paused until you upgrade.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
