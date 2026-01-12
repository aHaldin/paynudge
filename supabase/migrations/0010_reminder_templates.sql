create table if not exists public.reminder_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tone text not null,
  subject text not null,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, tone)
);

alter table public.reminder_templates enable row level security;

create policy "Users can read their reminder templates"
  on public.reminder_templates
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their reminder templates"
  on public.reminder_templates
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their reminder templates"
  on public.reminder_templates
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
