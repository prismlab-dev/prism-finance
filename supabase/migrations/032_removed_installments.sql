-- Installments moved to another card outlive the deletion of the purchase's card.
-- The group keeps a record of the erased ones; total_amount stays the sum of the
-- transactions that still exist.
alter table public.transaction_groups add column removed_installments jsonb not null default '[]'::jsonb
    constraint transaction_groups_removed_installments_check check (jsonb_typeof(removed_installments) = 'array');

do $$ declare definition text; revised text; step text[];
begin
    definition := pg_get_functiondef('public.apply_finance_changes_rowwise(bigint,jsonb,text)'::regprocedure);
    foreach step slice 1 in array array[
        ['installment_count, recurrence_rule, recurrence_end_date, source_wallet_id,',
         'installment_count, recurrence_rule, recurrence_end_date, removed_installments, source_wallet_id,'],
        -- Clients unaware of the column omit it: keep what is stored.
        ['(installment_count, recurrence_rule, recurrence_end_date,)(\s+source_wallet_id, destination_wallet_id, credit_card_id, created_at, now\(\))',
         '\1 coalesce(r.removed_installments, (select g.removed_installments from public.transaction_groups g where g.user_id = current_user_id and g.id = r.id), ''[]''::jsonb),\2'],
        ['installment_count integer, recurrence_rule jsonb,', 'installment_count integer, recurrence_rule jsonb, removed_installments jsonb,'],
        ['recurrence_end_date = excluded.recurrence_end_date,', 'recurrence_end_date = excluded.recurrence_end_date, removed_installments = excluded.removed_installments,']
    ] loop
        revised := regexp_replace(definition, step[1], step[2]);
        if revised = definition then raise exception 'Unexpected finance group writer shape: %', step[1]; end if;
        definition := revised;
    end loop;
    execute definition;
end; $$;
notify pgrst, 'reload schema';
