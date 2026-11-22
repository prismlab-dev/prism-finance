-- The transaction writer keeps occurrence_number when a payload omits it, so a
-- materialized occurrence converted to another mode (same id, new installment or
-- single group) kept its series slot and was rejected by assert_occurrence_identity.
-- A row that moves to a non-recurring group has left its series: clear the slot.
create or replace function public.clear_occurrence_on_series_exit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
    if new.occurrence_number is not null and new.group_id is distinct from old.group_id and not exists(
        select 1 from public.transaction_groups g
         where g.user_id = new.user_id and g.id = new.group_id and g.transaction_mode = 'recurring'
    ) then
        new.occurrence_number := null;
    end if;
    return new;
end;
$$;

create trigger transactions_clear_occurrence_on_series_exit
before update of group_id on public.transactions
for each row execute function public.clear_occurrence_on_series_exit();
