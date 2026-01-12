export type BillingProfile = {
  subscription_status?: string | null;
  trial_ends_at?: string | null;
};

const DAY_MS = 1000 * 60 * 60 * 24;
const DEFAULT_TRIAL_DAYS = 14;

export function getTrialEndsAt(
  profile: BillingProfile | null,
  trialDays = DEFAULT_TRIAL_DAYS
) {
  if (!profile) return null;
  if (profile.trial_ends_at) return new Date(profile.trial_ends_at);
  const start = new Date();
  return new Date(start.getTime() + trialDays * DAY_MS);
}

export function isSubscriptionActive(profile: BillingProfile | null) {
  const status = profile?.subscription_status ?? null;
  return status === 'active' || status === 'trialing';
}

export function isTrialActive(profile: BillingProfile | null) {
  const endsAt = getTrialEndsAt(profile);
  if (!endsAt) return false;
  return new Date() < endsAt;
}

export function isTrialExpired(profile: BillingProfile | null) {
  const endsAt = getTrialEndsAt(profile);
  if (!endsAt) return false;
  return new Date() >= endsAt;
}

export function daysLeft(profile: BillingProfile | null) {
  const endsAt = getTrialEndsAt(profile);
  if (!endsAt) return 0;
  const diffMs = endsAt.getTime() - new Date().getTime();
  return Math.max(0, Math.ceil(diffMs / DAY_MS));
}

export function hasAccess(profile: BillingProfile | null) {
  if (process.env.BILLING_ENABLED !== 'true') {
    return true;
  }
  return isSubscriptionActive(profile) || isTrialActive(profile);
}
