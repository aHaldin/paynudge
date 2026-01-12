export function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  return new (require('stripe'))(key);
}
