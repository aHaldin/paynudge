alter table profiles add column if not exists sender_name text default null;
alter table profiles add column if not exists reply_to_email text default null;
alter table profiles add column if not exists email_signature text default null;

alter table profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on profiles;
drop policy if exists "Profiles are insertable by owner" on profiles;
drop policy if exists "Profiles are updatable by owner" on profiles;

create policy "Profiles are viewable by owner" on profiles
  for select using (id = auth.uid());

create policy "Profiles are insertable by owner" on profiles
  for insert with check (id = auth.uid());

create policy "Profiles are updatable by owner" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
