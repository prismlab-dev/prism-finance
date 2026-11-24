-- Team finances reuse the personal finance tables. Their user_id column now
-- means "ledger owner": a user or a team (teams.id). finance_owners replaces the
-- FK to auth.users, so deleting a user or a team still cascades its ledger, and
-- every composite FK, trigger and projection keeps working unchanged.

create table if not exists public.finance_owners (
    id uuid primary key,
    user_id uuid unique references auth.users(id) on delete cascade,
    team_id uuid unique references public.teams(id) on delete cascade,
    check ((user_id is null) <> (team_id is null)),
    check (id = coalesce(user_id, team_id))
);

alter table public.finance_owners enable row level security;

insert into public.finance_owners(id, user_id) select id, id from auth.users on conflict do nothing;
insert into public.finance_owners(id, team_id) select id, id from public.teams on conflict do nothing;

create or replace function public.register_finance_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if tg_table_schema = 'auth' then
        insert into public.finance_owners(id, user_id) values (new.id, new.id) on conflict do nothing;
    else
        insert into public.finance_owners(id, team_id) values (new.id, new.id) on conflict do nothing;
    end if;
    return new;
end;
$$;

drop trigger if exists register_user_finance_owner on auth.users;
create trigger register_user_finance_owner after insert on auth.users
    for each row execute function public.register_finance_owner();
drop trigger if exists register_team_finance_owner on public.teams;
create trigger register_team_finance_owner after insert on public.teams
    for each row execute function public.register_finance_owner();

do $$
declare
    fk record;
begin
    for fk in
        select c.conrelid::regclass as table_name, c.conname
          from pg_constraint c
         where c.contype = 'f'
           and c.confrelid = 'auth.users'::regclass
           and c.conrelid::regclass::text in (
               'finance_preferences', 'wallets', 'credit_cards', 'beneficiaries', 'categories', 'tags',
               'wish_items', 'transaction_groups', 'credit_card_invoices', 'transactions', 'ledger_entries',
               'transaction_tags', 'transaction_details', 'transaction_attachments', 'finance_sync_state',
               'finance_change_log', 'finance_tombstones', 'attachment_deletion_queue'
           )
           and (select attname from pg_attribute where attrelid = c.conrelid and attnum = c.conkey[1]) = 'user_id'
    loop
        execute format('alter table %s drop constraint %I', fk.table_name, fk.conname);
        execute format(
            'alter table %s add constraint %I foreign key (user_id) references public.finance_owners(id) on delete cascade',
            fk.table_name, fk.conname
        );
    end loop;
end;
$$;

-- Members (viewer included) follow the team revision through Realtime.
drop policy if exists "finance-sync-state-team-read" on public.finance_sync_state;
create policy "finance-sync-state-team-read" on public.finance_sync_state
    for select to authenticated using (public.current_team_role(user_id) is not null);

-- The team RPCs run the personal ones as the team: the finance functions read
-- the owner from auth.uid(), which Supabase resolves from
-- request.jwt.claim.sub first. The claim is set transaction-locally and
-- restored before returning, so the caller's identity never leaks past the call.
create or replace function public.run_as_team_finance_owner(target_team_id uuid, allowed_roles text[], call text, args jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    caller_id uuid := auth.uid();
    result jsonb;
begin
    if caller_id is null then
        raise exception 'TEAM_AUTH_REQUIRED' using errcode = '42501';
    end if;
    if not coalesce(public.current_team_role(target_team_id) = any(allowed_roles), false) then
        raise exception 'TEAM_FINANCE_FORBIDDEN' using errcode = '42501';
    end if;

    perform set_config('request.jwt.claim.sub', target_team_id::text, true);
    if call = 'snapshot' then
        result := public.load_finance_snapshot();
    elsif call = 'changes' then
        result := public.load_finance_changes((args ->> 'since_revision')::bigint, (args ->> 'revision_limit')::integer);
    else
        result := public.apply_finance_changes((args ->> 'expected_revision')::bigint, args -> 'changes', args ->> 'client_id');
    end if;
    perform set_config('request.jwt.claim.sub', caller_id::text, true);
    return result;
end;
$$;

create or replace function public.load_team_finance_snapshot(target_team_id uuid)
returns jsonb
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
    select public.run_as_team_finance_owner(target_team_id, array['owner', 'admin', 'member', 'viewer'], 'snapshot', '{}'::jsonb);
$$;

create or replace function public.load_team_finance_changes(target_team_id uuid, since_revision bigint default 0, revision_limit integer default 50)
returns jsonb
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
    select public.run_as_team_finance_owner(
        target_team_id, array['owner', 'admin', 'member', 'viewer'], 'changes',
        jsonb_build_object('since_revision', since_revision, 'revision_limit', revision_limit)
    );
$$;

create or replace function public.apply_team_finance_changes(target_team_id uuid, expected_revision bigint, changes jsonb, client_id text)
returns jsonb
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
    select public.run_as_team_finance_owner(
        target_team_id, array['owner', 'admin', 'member'], 'apply',
        jsonb_build_object('expected_revision', expected_revision, 'changes', changes, 'client_id', client_id)
    );
$$;

revoke all on function public.register_finance_owner() from public;
revoke all on function public.run_as_team_finance_owner(uuid, text[], text, jsonb) from public;
revoke all on function public.load_team_finance_snapshot(uuid) from public;
revoke all on function public.load_team_finance_changes(uuid, bigint, integer) from public;
revoke all on function public.apply_team_finance_changes(uuid, bigint, jsonb, text) from public;
grant execute on function public.load_team_finance_snapshot(uuid) to authenticated;
grant execute on function public.load_team_finance_changes(uuid, bigint, integer) to authenticated;
grant execute on function public.apply_team_finance_changes(uuid, bigint, jsonb, text) to authenticated;

notify pgrst, 'reload schema';
