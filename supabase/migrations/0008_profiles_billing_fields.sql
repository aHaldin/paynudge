alter table profiles add column if not exists stripe_customer_id text;
alter table profiles add column if not exists subscription_status text;
alter table profiles add column if not exists current_period_end timestamptz;
