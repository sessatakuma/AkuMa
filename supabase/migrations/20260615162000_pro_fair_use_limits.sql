create table if not exists public.akuma_annotation_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    plan text not null check (plan in ('free', 'pro')),
    character_count integer not null check (character_count >= 0),
    created_at timestamptz not null default now()
);

alter table public.akuma_annotation_events enable row level security;

create index if not exists akuma_annotation_events_user_created_idx
on public.akuma_annotation_events (user_id, created_at desc);

grant usage on schema public to authenticated, service_role;
grant usage on schema private to service_role;

revoke all on table public.akuma_profiles from anon;
revoke all on table public.akuma_subscriptions from anon;
revoke all on table public.akuma_daily_usage from anon;
grant select on table public.akuma_profiles to authenticated;
grant select on table public.akuma_subscriptions to authenticated;
grant select on table public.akuma_daily_usage to authenticated;
grant select, insert, update, delete on table public.akuma_profiles to service_role;
grant select, insert, update, delete on table public.akuma_subscriptions to service_role;
grant select, insert, update, delete on table public.akuma_daily_usage to service_role;

revoke all on table public.akuma_annotation_events from anon, authenticated;
grant select, insert, update, delete on table public.akuma_annotation_events to service_role;

create or replace function private.decrement_akuma_daily_usage(
    target_user_id uuid,
    target_usage_date date
)
returns table(usage_count integer)
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.akuma_daily_usage
    set count = greatest(count - 1, 0), updated_at = now()
    where user_id = target_user_id and usage_date = target_usage_date
    returning count into usage_count;

    if not found then
        usage_count := 0;
    end if;

    return next;
end;
$$;

create or replace function private.record_akuma_pro_annotation_usage(
    target_user_id uuid,
    target_character_count integer,
    per_minute_limit integer,
    per_hour_limit integer,
    per_day_limit integer,
    per_day_character_limit integer
)
returns table(
    allowed boolean,
    reason text,
    minute_count integer,
    hour_count integer,
    day_count integer,
    day_character_count integer,
    annotation_event_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
    now_at timestamptz := now();
begin
    if target_character_count < 0 then
        raise exception 'target_character_count must not be negative';
    end if;

    perform pg_advisory_xact_lock(hashtext(target_user_id::text));

    select
        count(*) filter (where created_at >= now_at - interval '1 minute'),
        count(*) filter (where created_at >= now_at - interval '1 hour'),
        count(*) filter (where created_at >= now_at - interval '1 day'),
        coalesce(sum(character_count) filter (where created_at >= now_at - interval '1 day'), 0)
    into minute_count, hour_count, day_count, day_character_count
    from public.akuma_annotation_events
    where user_id = target_user_id;

    if minute_count >= per_minute_limit then
        allowed := false;
        reason := 'rate-minute';
        annotation_event_id := null;
        return next;
        return;
    end if;

    if hour_count >= per_hour_limit then
        allowed := false;
        reason := 'rate-hour';
        annotation_event_id := null;
        return next;
        return;
    end if;

    if day_count >= per_day_limit then
        allowed := false;
        reason := 'rate-day';
        annotation_event_id := null;
        return next;
        return;
    end if;

    if day_character_count + target_character_count > per_day_character_limit then
        allowed := false;
        reason := 'characters-day';
        annotation_event_id := null;
        return next;
        return;
    end if;

    insert into public.akuma_annotation_events (user_id, plan, character_count)
    values (target_user_id, 'pro', target_character_count)
    returning id into annotation_event_id;

    allowed := true;
    reason := null;
    minute_count := minute_count + 1;
    hour_count := hour_count + 1;
    day_count := day_count + 1;
    day_character_count := day_character_count + target_character_count;
    return next;
end;
$$;

create or replace function private.delete_akuma_annotation_event(
    target_user_id uuid,
    target_event_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    delete from public.akuma_annotation_events
    where user_id = target_user_id and id = target_event_id;
end;
$$;

revoke all on function private.decrement_akuma_daily_usage(uuid, date) from public;
revoke all on function private.record_akuma_pro_annotation_usage(uuid, integer, integer, integer, integer, integer) from public;
revoke all on function private.delete_akuma_annotation_event(uuid, uuid) from public;
grant execute on function private.decrement_akuma_daily_usage(uuid, date) to service_role;
grant execute on function private.record_akuma_pro_annotation_usage(uuid, integer, integer, integer, integer, integer) to service_role;
grant execute on function private.delete_akuma_annotation_event(uuid, uuid) to service_role;
