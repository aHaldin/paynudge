export function isBillingEnabledServer() {
  return process.env.BILLING_ENABLED === 'true';
}

export function isBillingEnabledClient() {
  return process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true';
}
