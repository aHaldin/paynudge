import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST() {
  const cwd = process.cwd();
  const envLocalPath = path.join(cwd, '.env.local');
  const hasEnvLocal = existsSync(envLocalPath);
  const secretKey = process.env.STRIPE_SECRET_KEY ?? '';
  const priceId = process.env.STRIPE_PRICE_ID ?? '';

  console.log(
    'Stripe env prefix',
    secretKey ? secretKey.slice(0, 8) : 'missing'
  );

  if (!secretKey || !priceId) {
    return NextResponse.json(
      {
        error: !secretKey ? 'Missing STRIPE_SECRET_KEY' : 'Missing STRIPE_PRICE_ID',
        cwd,
        envLocalExists: hasEnvLocal
      },
      { status: 500 }
    );
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  const origin = headers().get('origin') ?? 'http://localhost:3003';

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20'
    });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${origin}/app?checkout=success`,
      cancel_url: `${origin}/app?checkout=cancel`,
      client_reference_id: user.id,
      customer_email: profile?.stripe_customer_id ? undefined : user.email ?? undefined,
      customer: profile?.stripe_customer_id ?? undefined
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Unable to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
