create schema if not exists private;

create table if not exists public.akuma_profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    email text,
    stripe_customer_id text unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.akuma_subscriptions (
    user_id uuid primary key references auth.users (id) on delete cascade,
    stripe_customer_id text not null,
    stripe_subscription_id text unique,
    status text not null default 'inactive',
    price_id text,
    current_period_end timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.akuma_daily_usage (
    user_id uuid not null references auth.users (id) on delete cascade,
    usage_date date not null,
    count integer not null default 0 check (count >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, usage_date)
);

alter table public.akuma_profiles enable row level security;
alter table public.akuma_subscriptions enable row level security;
alter table public.akuma_daily_usage enable row level security;

drop policy if exists "Users can read their own AkuMa profile" on public.akuma_profiles;
create policy "Users can read their own AkuMa profile"
on public.akuma_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own AkuMa subscription" on public.akuma_subscriptions;
create policy "Users can read their own AkuMa subscription"
on public.akuma_subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own AkuMa usage" on public.akuma_daily_usage;
create policy "Users can read their own AkuMa usage"
on public.akuma_daily_usage
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function private.increment_akuma_daily_usage(
    target_user_id uuid,
    target_usage_date date,
    free_daily_cap integer
)
returns table(allowed boolean, usage_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
    existing_count integer;
begin
    if free_daily_cap < 1 then
        raise exception 'free_daily_cap must be positive';
    end if;

    insert into public.akuma_daily_usage (user_id, usage_date, count)
    values (target_user_id, target_usage_date, 0)
    on conflict (user_id, usage_date) do nothing;

    select count
    into existing_count
    from public.akuma_daily_usage
    where user_id = target_user_id and usage_date = target_usage_date
    for update;

    if existing_count >= free_daily_cap then
        allowed := false;
        usage_count := existing_count;
        return next;
        return;
    end if;

    update public.akuma_daily_usage
    set count = count + 1, updated_at = now()
    where user_id = target_user_id and usage_date = target_usage_date
    returning count into existing_count;

    allowed := true;
    usage_count := existing_count;
    return next;
end;
$$;

revoke all on function private.increment_akuma_daily_usage(uuid, date, integer) from public;
grant execute on function private.increment_akuma_daily_usage(uuid, date, integer) to service_role;
