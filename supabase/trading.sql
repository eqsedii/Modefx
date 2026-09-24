-- Run this AFTER schema.sql (Supabase: SQL Editor > New query > paste ALL > Run).
-- Adds the simulated trading account and the trade/journal table for the Starter tier.

create table public.trading_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric not null default 10000,
  created_at timestamptz not null default now()
);
alter table public.trading_accounts enable row level security;
create policy "read own trading account" on public.trading_accounts for select using (auth.uid() = user_id);
-- No insert/update policy: balance only ever changes through ensure_trading_account() / close_trade() below.

-- One row per simulated trade. A trade IS the journal entry — no separate journal table.
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('buy','sell')),
  qty numeric not null check (qty > 0),
  entry_price numeric not null,
  exit_price numeric,
  status text not null default 'open' check (status in ('open','closed')),
  pnl numeric,
  reason_in text,
  reason_out text,
  strategy text,
  risk_level text,
  note text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
create index on public.trades (user_id, opened_at desc);
alter table public.trades enable row level security;
create policy "read own trades" on public.trades for select using (auth.uid() = user_id);
-- No insert/update policy: trades can only be created/closed through the two functions below,
-- which enforce the tier rules (Starter must be unlocked to open; 20-entry cap below Growth).

-- Creates a trading account with the starting virtual balance the first time a user needs one.
-- Safe to call every time the page loads — it does nothing if the account already exists.
create function public.ensure_trading_account()
returns numeric language plpgsql security definer set search_path = public as $$
declare bal numeric;
begin
  insert into public.trading_accounts (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select balance into bal from public.trading_accounts where user_id = auth.uid();
  return bal;
end $$;
revoke all on function public.ensure_trading_account() from public, anon;
grant execute on function public.ensure_trading_account() to authenticated;

-- Opens a new simulated trade. Rejects the call if Starter isn't currently unlocked, or if the
-- user is below Growth and already has 20 trades (the Starter journal cap).
create function public.open_trade(p_symbol text, p_side text, p_qty numeric, p_entry_price numeric, p_reason_in text, p_strategy text, p_risk_level text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  has_starter boolean;
  has_growth boolean;
  trade_count int;
  new_id uuid;
begin
  select exists(select 1 from public.entitlements where user_id = auth.uid() and tier = 'starter' and (expires_at is null or expires_at > now())) into has_starter;
  if not has_starter then
    raise exception 'starter_locked' using errcode = 'P0001';
  end if;

  select exists(select 1 from public.entitlements where user_id = auth.uid() and tier = 'growth') into has_growth;
  if not has_growth then
    select count(*) into trade_count from public.trades where user_id = auth.uid();
    if trade_count >= 20 then
      raise exception 'journal_full' using errcode = 'P0001';
    end if;
  end if;

  insert into public.trades (user_id, symbol, side, qty, entry_price, reason_in, strategy, risk_level)
  values (auth.uid(), p_symbol, p_side, p_qty, p_entry_price, p_reason_in, p_strategy, p_risk_level)
  returning id into new_id;

  perform public.ensure_trading_account();
  return new_id;
end $$;
revoke all on function public.open_trade(text, text, numeric, numeric, text, text, text) from public, anon;
grant execute on function public.open_trade(text, text, numeric, numeric, text, text, text) to authenticated;

-- Closes an open trade, applies the profit/loss to the virtual balance, and records the exit
-- reason/note. Existing open trades can always be closed, even if Starter has since locked.
create function public.close_trade(p_trade_id uuid, p_exit_price numeric, p_reason_out text, p_note text)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  t public.trades;
  realized numeric;
begin
  select * into t from public.trades where id = p_trade_id and user_id = auth.uid() and status = 'open';
  if not found then
    raise exception 'trade_not_open' using errcode = 'P0001';
  end if;

  realized := (p_exit_price - t.entry_price) * t.qty * (case when t.side = 'buy' then 1 else -1 end);

  update public.trades set exit_price = p_exit_price, status = 'closed', pnl = realized,
    reason_out = p_reason_out, note = p_note, closed_at = now()
  where id = p_trade_id;

  perform public.ensure_trading_account();
  update public.trading_accounts set balance = balance + realized where user_id = auth.uid();

  return realized;
end $$;
revoke all on function public.close_trade(uuid, numeric, text, text) from public, anon;
grant execute on function public.close_trade(uuid, numeric, text, text) to authenticated;
