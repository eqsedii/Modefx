-- Run in Supabase: SQL Editor > New query > paste ALL of this > Run.
-- Safe to run once on a fresh project. If you already ran an older version of this file
-- (with a "subscriptions" table), read the NOTE near the bottom before running this.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user','moderator','admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);
-- Users may edit their display name only. They can never change their own role.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, split_part(new.email, '@', 1));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- One row per payment attempt. plan_id is the tier being bought: starter, growth, pro or golden.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null check (plan_id in ('starter','growth','pro','golden')),
  amount integer not null,
  external_reference text not null unique,
  status text not null default 'pending' check (status in ('pending','success','failed')),
  mpesa_receipt text,
  phone_last4 text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.payments (user_id, created_at desc);
alter table public.payments enable row level security;
create policy "read own payments" on public.payments for select using (auth.uid() = user_id);
-- No insert/update policies: only the server (service role) writes payments.

-- One row per tier the user has ever unlocked. expires_at is null = unlocked forever.
-- Only "starter" is ever given a real expires_at (7 days); every other tier is permanent
-- from the moment it's granted, and growth being granted also makes starter permanent.
create table public.entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('starter','growth','pro','golden')),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  payment_id uuid not null references public.payments(id),
  primary key (user_id, tier)
);
alter table public.entitlements enable row level security;
create policy "read own entitlements" on public.entitlements for select using (auth.uid() = user_id);

-- Unlocks a tier for a user. Called only by the webhook, after a payment succeeds.
-- Buying "growth" also makes "starter" permanent (expires_at = null), per the product rule
-- that once both are paid, both stay unlocked forever.
create function public.grant_entitlement(p_user uuid, p_tier text, p_lock_days int, p_payment uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.entitlements (user_id, tier, expires_at, payment_id)
  values (p_user, p_tier, case when p_lock_days is null then null else now() + make_interval(days => p_lock_days) end, p_payment)
  on conflict (user_id, tier) do update set expires_at = excluded.expires_at, payment_id = excluded.payment_id;

  if p_tier = 'growth' then
    update public.entitlements set expires_at = null where user_id = p_user and tier = 'starter';
  end if;
end $$;
revoke all on function public.grant_entitlement(uuid, text, int, uuid) from public, anon, authenticated;
grant execute on function public.grant_entitlement(uuid, text, int, uuid) to service_role;

-- NOTE: migrating from the old duration-based "subscriptions" table
-- If a table called "subscriptions" already exists from an earlier version of this file,
-- and it has no rows you care about (e.g. this is still a test project), just run:
--   drop table if exists public.subscriptions;
-- before running the rest of this file. If you have real customer data in it, stop and
-- ask for a migration plan instead of dropping it.
