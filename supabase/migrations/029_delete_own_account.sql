-- Exclusão da própria conta: apaga o usuário de auth.users e deixa as FKs
-- "on delete cascade" removerem dados financeiros, perfil e família que ele possui.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    current_user_id uuid := auth.uid();
begin
    if current_user_id is null then
        raise exception 'ACCOUNT_AUTH_REQUIRED' using errcode = 'P0001';
    end if;

    delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
