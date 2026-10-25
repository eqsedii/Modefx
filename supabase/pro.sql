-- Run this AFTER schema.sql, trading.sql and sl-tp.sql (Supabase: SQL Editor > New query > paste ALL > Run).
-- Adds the Pro tier's database pieces: strategy playbooks and the community board.
-- Every policy checks that the signed-in user owns Pro, so the rules hold even if someone edits the website code.

-- True when the signed-in user has the given tier unlocked right now.
create or replace function public.has_tier(p_tier text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.entitlements
    where user_id = auth.uid() and tier = p_tier and (expires_at is null or expires_at > now())
  );
$$;
revoke all on function public.has_tier(text) from public, anon;
grant execute on function public.has_tier(text) to authenticated;

-- True for moderators and admins (they can remove community posts).
create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('moderator','admin'));
$$;
revoke all on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;

-- ---------- Strategy playbook: one row per documented strategy, private to its owner ----------
create table public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.strategies (user_id, updated_at desc);
alter table public.strategies enable row level security;
create policy "read own strategies" on public.strategies for select using (auth.uid() = user_id and public.has_tier('pro'));
create policy "add own strategies" on public.strategies for insert with check (auth.uid() = user_id and public.has_tier('pro'));
create policy "edit own strategies" on public.strategies for update using (auth.uid() = user_id and public.has_tier('pro')) with check (auth.uid() = user_id);
create policy "delete own strategies" on public.strategies for delete using (auth.uid() = user_id);

-- ---------- Community board ----------
-- Posts and comments cannot contain links, phone numbers or WhatsApp/Telegram handles. This is enforced here in the
-- database (not just on the page) so the board cannot be used to sell signals or run scams.
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Trader',
  topic text not null default 'general' check (topic in ('general','forex','crypto','stocks','risk','psychology','strategy','question')),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  constraint no_contact_in_post check ((title || ' ' || body) !~* '(https?://|www\.|[a-z0-9-]+\.(com|co|ke|io|me|net|org|xyz|ly)\y|\+?254[ -]?[0-9]{6,}|\y0[17][0-9 -]{7,}|t\.me/|whatsapp)'),
  created_at timestamptz not null default now()
);
create index on public.community_posts (created_at desc);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Trader',
  body text not null check (char_length(body) between 1 and 1000),
  constraint no_contact_in_comment check (body !~* '(https?://|www\.|[a-z0-9-]+\.(com|co|ke|io|me|net|org|xyz|ly)\y|\+?254[ -]?[0-9]{6,}|\y0[17][0-9 -]{7,}|t\.me/|whatsapp)'),
  created_at timestamptz not null default now()
);
create index on public.community_comments (post_id, created_at);

-- The author name is always copied from the user's profile on the server, so nobody can post under someone else's name.
create or replace function public.stamp_author_name() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.author_name := coalesce(nullif(trim((select display_name from public.profiles where id = new.user_id)), ''), 'Trader');
  return new;
end $$;
create trigger posts_author before insert on public.community_posts for each row execute function public.stamp_author_name();
create trigger comments_author before insert on public.community_comments for each row execute function public.stamp_author_name();

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
create policy "pro reads posts" on public.community_posts for select using (public.has_tier('pro'));
create policy "pro writes posts" on public.community_posts for insert with check (auth.uid() = user_id and public.has_tier('pro'));
create policy "author or mod deletes posts" on public.community_posts for delete using (auth.uid() = user_id or public.is_moderator());
create policy "pro reads comments" on public.community_comments for select using (public.has_tier('pro'));
create policy "pro writes comments" on public.community_comments for insert with check (auth.uid() = user_id and public.has_tier('pro'));
create policy "author or mod deletes comments" on public.community_comments for delete using (auth.uid() = user_id or public.is_moderator());
