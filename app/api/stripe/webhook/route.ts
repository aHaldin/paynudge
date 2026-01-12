import Stripe from 'stripe';
import { NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/lib/stripe/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook error', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const computeHasAccess = (
    trialEndsAt: string | null,
    subscriptionStatus: Stripe.Subscription.Status | null
  ) => {
    const hasSubscription =
      subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
    if (hasSubscription) return true;
    if (!trialEndsAt) return false;
    return new Date() < new Date(trialEndsAt);
  };

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id || session.metadata?.user_id;
    const customerId =
      typeof session.customer === 'string' ? session.customer : null;
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : null;

    if (userId) {
      let subscriptionStatus: Stripe.Subscription.Status | null = null;
      let currentPeriodEnd: string | null = null;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        subscriptionStatus = subscription.status;
        currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_ends_at')
        .eq('id', userId)
        .maybeSingle();

      const { error } = await supabase
        .from('profiles')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: subscriptionStatus,
          current_period_end: currentPeriodEnd,
          has_access: computeHasAccess(
            profile?.trial_ends_at ?? null,
            subscriptionStatus
          )
        })
        .eq('id', userId);

      if (error) {
        console.error('Profile update failed', error.message);
        return NextResponse.json(
          { error: 'Profile update failed' },
          { status: 500 }
        );
      }
    }
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : null;
    const status = subscription.status;
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    if (customerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_ends_at')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();

      const { error } = await supabase
        .from('profiles')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          subscription_status: status,
          current_period_end: currentPeriodEnd,
          has_access: computeHasAccess(
            profile?.trial_ends_at ?? null,
            status
          )
        })
        .eq('stripe_customer_id', customerId);

      if (error) {
        console.error('Subscription update failed', error.message);
        return NextResponse.json(
          { error: 'Subscription update failed' },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
