-- Run in Supabase: SQL Editor > New query > paste > Run.

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

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
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

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  payment_id uuid not null unique references public.payments(id),
  created_at timestamptz not null default now()
);
create index on public.subscriptions (user_id, ends_at desc);
alter table public.subscriptions enable row level security;
create policy "read own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);

-- Adds time to the user's plan. If they still have time left, the new period starts after it.
create function public.activate_subscription(p_user uuid, p_plan text, p_days int, p_payment uuid)
returns void language plpgsql security definer set search_path = public as $$
declare start_at timestamptz;
begin
  select greatest(now(), coalesce(max(ends_at), now())) into start_at from public.subscriptions where user_id = p_user;
  insert into public.subscriptions (user_id, plan_id, starts_at, ends_at, payment_id)
  values (p_user, p_plan, start_at, start_at + make_interval(days => p_days), p_payment)
  on conflict (payment_id) do nothing;
end $$;
revoke all on function public.activate_subscription(uuid, text, int, uuid) from public, anon, authenticated;
grant execute on function public.activate_subscription(uuid, text, int, uuid) to service_role;
