import Link from 'next/link';

import { UpgradeButton } from '@/app/app/billing/UpgradeButton';
import { ManageBillingButton } from '@/components/billing/ManageBillingButton';
import {
  daysLeft,
  hasAccess,
  isSubscriptionActive,
  isTrialActive,
  isTrialExpired
} from '@/lib/billing/access';

type DashboardBillingBannerProps = {
  subscription_status?: string | null;
  trial_ends_at?: string | null;
};

export function DashboardBillingBanner(props: DashboardBillingBannerProps) {
  const subscriptionActive = isSubscriptionActive(props);
  const trialActive = isTrialActive(props);
  const trialExpired = isTrialExpired(props);
  const access = hasAccess(props);

  if (subscriptionActive) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <div>
          <p className="font-semibold text-ink">Plan: £9.99 / month</p>
          <p className="text-sm text-slate-600">Subscription active.</p>
        </div>
        <ManageBillingButton />
      </div>
    );
  }

  if (trialActive) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <div>
          <p className="font-semibold text-ink">
            Free trial — {daysLeft(props)} days left
          </p>
          <p className="text-sm text-slate-600">
            You’re on the free plan. Upgrade anytime to keep reminders running.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <UpgradeButton />
          <Link href="/pricing" className="text-sm text-slate-600 hover:text-ink">
            View pricing
          </Link>
        </div>
      </div>
    );
  }

  if (!access && trialExpired) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <div>
          <p className="font-semibold text-ink">Trial ended</p>
          <p className="text-sm text-slate-600">
            Upgrade to keep sending automated reminders.
          </p>
        </div>
        <UpgradeButton />
      </div>
    );
  }

  return null;
}
