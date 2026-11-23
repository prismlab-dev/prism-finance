-- A card purchase stores a source wallet that never moves cash, so changing it is
-- not a change of financial history. Wallet deletion detaches these groups first;
-- otherwise its cascade removes charges from paid invoices (INVOICE_OVERPAYMENT).
-- A paid invoice payment may likewise lose its wallet, becoming a settlement without
-- cash movement, so the invoice stays paid. Its ledger row is rebuilt by the projection.
create or replace function public.guard_group_financial_history()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
    if new.source_wallet_id is null and old.source_wallet_id is not null
       and (new.type, new.destination_wallet_id, new.credit_card_id) is not distinct from (old.type, old.destination_wallet_id, old.credit_card_id)
       and exists (select 1 from public.transactions t where t.user_id = old.user_id and t.group_id = old.id and t.payment_for_invoice_id is not null)
       and not exists (select 1 from public.transactions t where t.user_id = old.user_id and t.group_id = old.id and t.payment_for_invoice_id is null)
    then return new; end if;
    if (new.type, case when new.credit_card_id is null then new.source_wallet_id end, new.destination_wallet_id, new.credit_card_id)
       is distinct from (old.type, case when old.credit_card_id is null then old.source_wallet_id end, old.destination_wallet_id, old.credit_card_id)
       and exists (select 1 from public.transactions t where t.user_id = old.user_id and t.group_id = old.id and (t.status = 'paid' or
           (t.invoice_id is not null and exists (select 1 from public.transactions p where p.user_id = t.user_id and p.payment_for_invoice_id = t.invoice_id and p.status = 'paid'))))
    then raise exception 'GROUP_FINANCIAL_HISTORY_IMMUTABLE' using errcode = '23514'; end if;
    return new;
end;
$$;
revoke all on function public.guard_group_financial_history() from public;
