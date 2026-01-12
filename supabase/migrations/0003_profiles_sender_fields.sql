alter table profiles add column if not exists user_id uuid;
update profiles set user_id = id where user_id is null;
alter table profiles alter column user_id set not null;

alter table profiles add column if not exists sender_name text;
alter table profiles add column if not exists reply_to_email text;
alter table profiles add column if not exists signature text;
alter table profiles add column if not exists updated_at timestamptz default now();

create unique index if not exists profiles_user_id_key on profiles(user_id);

alter table profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on profiles;
drop policy if exists "Profiles are insertable by owner" on profiles;
drop policy if exists "Profiles are updatable by owner" on profiles;

create policy "Profiles are viewable by owner" on profiles
  for select using (user_id = auth.uid());

create policy "Profiles are insertable by owner" on profiles
  for insert with check (user_id = auth.uid());

create policy "Profiles are updatable by owner" on profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
