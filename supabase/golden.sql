-- Run AFTER schema.sql and pro.sql (needs has_tier()). Supabase: SQL Editor > New query > paste ALL > Run.
-- Golden tier: one saved Deriv login ID per user. Modefx stores the ID as a reference only.
-- It never receives a Deriv password or API token, and it cannot trade on the account.
create table public.deriv_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  login_id text not null check (login_id ~ '^[A-Z]{2,5}[0-9]{4,10}$'),
  nickname text check (nickname is null or char_length(nickname) <= 40),
  linked_at timestamptz not null default now()
);
alter table public.deriv_links enable row level security;
create policy "read own deriv link" on public.deriv_links for select using (auth.uid() = user_id and public.has_tier('golden'));
create policy "add own deriv link" on public.deriv_links for insert with check (auth.uid() = user_id and public.has_tier('golden'));
create policy "edit own deriv link" on public.deriv_links for update using (auth.uid() = user_id and public.has_tier('golden')) with check (auth.uid() = user_id);
create policy "remove own deriv link" on public.deriv_links for delete using (auth.uid() = user_id);
