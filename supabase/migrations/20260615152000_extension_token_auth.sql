create extension if not exists pgcrypto;

create table if not exists public.akuma_extension_auth_codes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    code_hash text not null unique,
    redirect_origin text not null,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.akuma_extension_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    token_hash text not null unique,
    name text not null default 'Chrome extension',
    expires_at timestamptz not null,
    revoked_at timestamptz,
    last_used_at timestamptz,
    created_at timestamptz not null default now()
);

alter table public.akuma_extension_auth_codes enable row level security;
alter table public.akuma_extension_tokens enable row level security;

create index if not exists akuma_extension_auth_codes_user_id_idx
on public.akuma_extension_auth_codes (user_id);

create index if not exists akuma_extension_auth_codes_expires_at_idx
on public.akuma_extension_auth_codes (expires_at);

create index if not exists akuma_extension_tokens_user_id_idx
on public.akuma_extension_tokens (user_id);

create index if not exists akuma_extension_tokens_expires_at_idx
on public.akuma_extension_tokens (expires_at);

revoke all on table public.akuma_extension_auth_codes from anon, authenticated;
revoke all on table public.akuma_extension_tokens from anon, authenticated;

grant select, insert, update, delete on table public.akuma_profiles to service_role;
grant select, insert, update, delete on table public.akuma_subscriptions to service_role;
grant select, insert, update, delete on table public.akuma_daily_usage to service_role;
grant select, insert, update, delete on table public.akuma_extension_auth_codes to service_role;
grant select, insert, update, delete on table public.akuma_extension_tokens to service_role;
grant usage on schema private to service_role;
