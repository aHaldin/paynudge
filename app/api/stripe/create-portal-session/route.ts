import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY ?? '';
  if (!secretKey) {
    return NextResponse.json(
      { error: 'Missing STRIPE_SECRET_KEY' },
      { status: 500 }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No Stripe customer yet.' },
      { status: 400 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? headers().get('origin') ?? '';

  if (!baseUrl) {
    return NextResponse.json(
      { error: 'Missing NEXT_PUBLIC_SITE_URL' },
      { status: 500 }
    );
  }

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${baseUrl}/app/account`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe portal error', error);
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
