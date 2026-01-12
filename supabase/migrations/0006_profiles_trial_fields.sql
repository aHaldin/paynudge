alter table profiles add column if not exists trial_starts_at timestamptz;
alter table profiles add column if not exists trial_ends_at timestamptz;
alter table profiles add column if not exists plan text default 'trial';
alter table profiles add column if not exists stripe_customer_id text;
alter table profiles add column if not exists stripe_subscription_id text;
alter table profiles add column if not exists plan_status text;
alter table profiles add column if not exists plan_renews_at timestamptz;
