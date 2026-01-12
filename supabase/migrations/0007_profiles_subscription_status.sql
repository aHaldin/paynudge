alter table profiles add column if not exists subscription_status text;

update profiles
set subscription_status = plan_status
where subscription_status is null and plan_status is not null;
