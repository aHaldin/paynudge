create extension if not exists "pgcrypto";

create type invoice_status as enum ('draft', 'sent', 'paid', 'void');
create type reminder_tone as enum ('friendly', 'neutral', 'firm');

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  email text not null,
  company_name text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  client_id uuid references clients on delete cascade not null,
  invoice_number text not null,
  currency text default 'GBP',
  amount_pennies int not null,
  issue_date date not null,
  due_date date not null,
  status invoice_status default 'sent',
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists reminder_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  days_offset int not null,
  tone reminder_tone not null,
  enabled boolean default true,
  created_at timestamptz default now()
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  invoice_id uuid references invoices on delete cascade not null,
  rule_id uuid references reminder_rules on delete set null,
  channel text default 'email',
  subject text,
  body text,
  sent_to text,
  sent_at timestamptz default now(),
  provider_id text
);

create table if not exists reminder_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  tone reminder_tone not null,
  subject text not null,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, tone)
);

alter table profiles enable row level security;
alter table clients enable row level security;
alter table invoices enable row level security;
alter table reminder_rules enable row level security;
alter table reminders enable row level security;
alter table reminder_templates enable row level security;

create policy "Profiles are viewable by owner" on profiles
  for select using (id = auth.uid());

create policy "Profiles are insertable by owner" on profiles
  for insert with check (id = auth.uid());

create policy "Profiles are updatable by owner" on profiles
  for update using (id = auth.uid());

create policy "Clients are viewable by owner" on clients
  for select using (user_id = auth.uid());

create policy "Clients are insertable by owner" on clients
  for insert with check (user_id = auth.uid());

create policy "Clients are updatable by owner" on clients
  for update using (user_id = auth.uid());

create policy "Clients are deletable by owner" on clients
  for delete using (user_id = auth.uid());

create policy "Invoices are viewable by owner" on invoices
  for select using (user_id = auth.uid());

create policy "Invoices are insertable by owner" on invoices
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from clients c where c.id = invoices.client_id and c.user_id = auth.uid()
    )
  );

create policy "Invoices are updatable by owner" on invoices
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from clients c where c.id = invoices.client_id and c.user_id = auth.uid()
    )
  );

create policy "Invoices are deletable by owner" on invoices
  for delete using (user_id = auth.uid());

create policy "Reminder rules are viewable by owner" on reminder_rules
  for select using (user_id = auth.uid());

create policy "Reminder rules are insertable by owner" on reminder_rules
  for insert with check (user_id = auth.uid());

create policy "Reminder rules are updatable by owner" on reminder_rules
  for update using (user_id = auth.uid());

create policy "Reminder rules are deletable by owner" on reminder_rules
  for delete using (user_id = auth.uid());

create policy "Reminders are viewable by owner" on reminders
  for select using (user_id = auth.uid());

create policy "Reminders are insertable by owner" on reminders
  for insert with check (user_id = auth.uid());

create policy "Reminders are deletable by owner" on reminders
  for delete using (user_id = auth.uid());

create policy "Reminder templates are viewable by owner" on reminder_templates
  for select using (user_id = auth.uid());

create policy "Reminder templates are insertable by owner" on reminder_templates
  for insert with check (user_id = auth.uid());

create policy "Reminder templates are updatable by owner" on reminder_templates
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Reminder templates are deletable by owner" on reminder_templates
  for delete using (user_id = auth.uid());
