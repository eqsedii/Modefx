-- Run this AFTER trading.sql (Supabase: SQL Editor > New query > paste ALL > Run).
-- Adds optional stop-loss / take-profit to trades, and expands open_trade to accept them.

alter table public.trades add column stop_loss numeric;
alter table public.trades add column take_profit numeric;

-- Replaces the old 7-argument version with a 9-argument one that also stores SL/TP.
drop function if exists public.open_trade(text, text, numeric, numeric, text, text, text);

create function public.open_trade(
  p_symbol text, p_side text, p_qty numeric, p_entry_price numeric,
  p_reason_in text, p_strategy text, p_risk_level text,
  p_stop_loss numeric default null, p_take_profit numeric default null
)
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

  insert into public.trades (user_id, symbol, side, qty, entry_price, reason_in, strategy, risk_level, stop_loss, take_profit)
  values (auth.uid(), p_symbol, p_side, p_qty, p_entry_price, p_reason_in, p_strategy, p_risk_level, p_stop_loss, p_take_profit)
  returning id into new_id;

  perform public.ensure_trading_account();
  return new_id;
end $$;
revoke all on function public.open_trade(text, text, numeric, numeric, text, text, text, numeric, numeric) from public, anon;
grant execute on function public.open_trade(text, text, numeric, numeric, text, text, text, numeric, numeric) to authenticated;
