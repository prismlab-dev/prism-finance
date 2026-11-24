-- Despesas da equipe pagas no livro pessoal. O vínculo vive no próprio grupo
-- (transaction_groups.team_expense), então o lado pessoal (saldo/fatura) e o da
-- equipe saem da mesma linha, gravados pela mesma apply_finance_changes.
--   {"kind":"expense","teamId":…,"mode":"equal|percent|fixed|team","shares":[{"memberId":…,"value":…}]}
--   {"kind":"settlement","teamId":…,"fromMemberId":…}   (acerto recebido pelo dono do livro)
-- A equipe só lê uma projeção estreita (get_team_expenses): nunca carteira, cartão,
-- saldo, limite, fechamento ou vencimento. Saldos entre membros são calculados aqui.

alter table public.transaction_groups add column if not exists team_expense jsonb
    constraint transaction_groups_team_expense_check check (team_expense is null or jsonb_typeof(team_expense) = 'object');

create index if not exists transaction_groups_team_expense_idx
    on public.transaction_groups(((team_expense ->> 'teamId')::uuid)) where team_expense is not null;

do $$ declare definition text; revised text; step text[];
begin
    definition := pg_get_functiondef('public.apply_finance_changes_rowwise(bigint,jsonb,text)'::regprocedure);
    foreach step slice 1 in array array[
        ['recurrence_end_date, removed_installments, source_wallet_id,',
         'recurrence_end_date, removed_installments, team_expense, source_wallet_id,'],
        ['(''\[\]''::jsonb\),)(\s+source_wallet_id, destination_wallet_id, credit_card_id, created_at, now\(\))',
         '\1 r.team_expense,\2'],
        ['removed_installments jsonb,', 'removed_installments jsonb, team_expense jsonb,'],
        ['removed_installments = excluded.removed_installments,', 'removed_installments = excluded.removed_installments, team_expense = excluded.team_expense,']
    ] loop
        revised := regexp_replace(definition, step[1], step[2]);
        if revised = definition then raise exception 'Unexpected finance group writer shape: %', step[1]; end if;
        definition := revised;
    end loop;
    execute definition;
end; $$;

create or replace function public.validate_team_expense()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    expense jsonb := new.team_expense;
    target_team uuid;
    share_count integer;
    share_total numeric;
begin
    -- Só valida quando o vínculo muda: quem saiu da equipe ainda edita o resto do grupo.
    if expense is null or (tg_op = 'UPDATE' and old.team_expense is not distinct from expense
                           and old.total_amount = new.total_amount and old.type = new.type) then
        return new;
    end if;

    target_team := (expense ->> 'teamId')::uuid;
    if not exists (select 1 from public.team_members where team_id = target_team and user_id = new.user_id
                   and role in ('owner', 'admin', 'member')) then
        raise exception 'TEAM_EXPENSE_NOT_MEMBER' using errcode = '42501';
    end if;

    if expense ->> 'kind' = 'settlement' then
        if new.type <> 'income' or (expense ->> 'fromMemberId')::uuid = new.user_id
           or not exists (select 1 from public.team_members where team_id = target_team and user_id = (expense ->> 'fromMemberId')::uuid) then
            raise exception 'TEAM_SETTLEMENT_INVALID' using errcode = '22023';
        end if;
        return new;
    end if;

    if expense ->> 'kind' <> 'expense' or new.type <> 'expense'
       or coalesce(expense ->> 'mode', '') not in ('equal', 'percent', 'fixed', 'team')
       or jsonb_typeof(coalesce(expense -> 'shares', 'null'::jsonb)) <> 'array' then
        raise exception 'TEAM_EXPENSE_INVALID' using errcode = '22023';
    end if;

    select count(*), coalesce(sum((s ->> 'value')::numeric), 0)
      into share_count, share_total
      from jsonb_array_elements(expense -> 'shares') s;

    if exists (
        select 1 from jsonb_array_elements(expense -> 'shares') s
         where not exists (select 1 from public.team_members m where m.team_id = target_team and m.user_id = (s ->> 'memberId')::uuid)
            or (s ->> 'value')::numeric < 0
    ) or share_count <> (select count(distinct s ->> 'memberId') from jsonb_array_elements(expense -> 'shares') s) then
        raise exception 'TEAM_EXPENSE_SHARES_INVALID' using errcode = '22023';
    end if;

    if (expense ->> 'mode' = 'team' and share_count <> 0)
       or (expense ->> 'mode' <> 'team' and share_count = 0)
       or (expense ->> 'mode' = 'percent' and share_total <> 100)
       or (expense ->> 'mode' = 'fixed' and share_total <> new.total_amount) then
        raise exception 'TEAM_EXPENSE_SPLIT_MISMATCH' using errcode = '22023';
    end if;
    return new;
end;
$$;

drop trigger if exists validate_team_expense on public.transaction_groups;
create trigger validate_team_expense before insert or update on public.transaction_groups
    for each row execute function public.validate_team_expense();

-- Outro membro tira a despesa da equipe sem tocar no livro do pagador.
create table if not exists public.team_expense_exclusions (
    team_id uuid not null references public.teams(id) on delete cascade,
    payer_id uuid not null,
    group_id text not null,
    excluded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    primary key (team_id, payer_id, group_id),
    foreign key (payer_id, group_id) references public.transaction_groups(user_id, id) on delete cascade
);

alter table public.team_expense_exclusions enable row level security;

create or replace function public.remove_team_expense(target_team_id uuid, target_payer_id uuid, target_group_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if coalesce(public.current_team_role(target_team_id), 'viewer') = 'viewer' then
        raise exception 'TEAM_FINANCE_FORBIDDEN' using errcode = '42501';
    end if;
    if not exists (select 1 from public.transaction_groups g where g.user_id = target_payer_id and g.id = target_group_id
                   and g.team_expense ->> 'teamId' = target_team_id::text) then
        raise exception 'TEAM_EXPENSE_NOT_FOUND' using errcode = 'P0002';
    end if;
    insert into public.team_expense_exclusions(team_id, payer_id, group_id, excluded_by)
    values (target_team_id, target_payer_id, target_group_id, auth.uid())
    on conflict do nothing;
end;
$$;

-- Linhas da equipe com o custo de cada membro já resolvido por ocorrência.
create or replace function public.team_expense_rows(target_team_id uuid)
returns table(
    transaction_id text, group_id text, payer_id uuid, kind text, mode text, title text, amount numeric,
    scheduled_date date, status text, from_member_id uuid, shares jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select t.id, g.id, g.user_id, g.team_expense ->> 'kind', g.team_expense ->> 'mode',
           coalesce(t.title, g.title), t.amount, t.scheduled_date, t.status,
           (g.team_expense ->> 'fromMemberId')::uuid,
           coalesce((
               select jsonb_agg(jsonb_build_object('memberId', s ->> 'memberId', 'amount', round(
                   case g.team_expense ->> 'mode'
                       when 'equal' then t.amount / jsonb_array_length(g.team_expense -> 'shares')
                       when 'percent' then t.amount * (s ->> 'value')::numeric / 100
                       else (s ->> 'value')::numeric * t.amount / nullif(g.total_amount, 0)
                   end, 2)))
                 from jsonb_array_elements(g.team_expense -> 'shares') s
           ), '[]'::jsonb)
      from public.transaction_groups g
      join public.transactions t on t.user_id = g.user_id and t.group_id = g.id
     where g.team_expense ->> 'teamId' = target_team_id::text
       and t.status not in ('cancelled', 'skipped')
       and not exists (select 1 from public.team_expense_exclusions x
                        where x.team_id = target_team_id and x.payer_id = g.user_id and x.group_id = g.id);
$$;

create or replace function public.get_team_expenses(target_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
    if public.current_team_role(target_team_id) is null then
        raise exception 'TEAM_FINANCE_FORBIDDEN' using errcode = '42501';
    end if;

    return jsonb_build_object(
        'expenses', coalesce((
            select jsonb_agg(jsonb_build_object(
                'transaction_id', r.transaction_id, 'group_id', r.group_id, 'payer_id', r.payer_id, 'kind', r.kind,
                'mode', r.mode, 'title', r.title, 'amount', r.amount, 'scheduled_date', r.scheduled_date,
                'status', r.status, 'from_member_id', r.from_member_id, 'shares', r.shares
            ) order by r.scheduled_date desc, r.transaction_id)
              from public.team_expense_rows(target_team_id) r
        ), '[]'::jsonb),
        -- Positivo: o membro tem a receber; negativo: deve à equipe.
        'balances', coalesce((
            select jsonb_agg(jsonb_build_object('member_id', b.member_id, 'net', b.net) order by b.member_id)
              from (
                  select movement.member_id, round(sum(movement.delta), 2) as net
                    from (
                        select r.payer_id as member_id, (s ->> 'amount')::numeric as delta
                          from public.team_expense_rows(target_team_id) r, jsonb_array_elements(r.shares) s
                         where r.kind = 'expense' and (s ->> 'memberId')::uuid <> r.payer_id
                        union all
                        select (s ->> 'memberId')::uuid, -(s ->> 'amount')::numeric
                          from public.team_expense_rows(target_team_id) r, jsonb_array_elements(r.shares) s
                         where r.kind = 'expense' and (s ->> 'memberId')::uuid <> r.payer_id
                        union all
                        select r.from_member_id, r.amount from public.team_expense_rows(target_team_id) r where r.kind = 'settlement'
                        union all
                        select r.payer_id, -r.amount from public.team_expense_rows(target_team_id) r where r.kind = 'settlement'
                    ) movement
                   group by movement.member_id
              ) b
        ), '[]'::jsonb)
    );
end;
$$;

revoke all on function public.validate_team_expense() from public;
revoke all on function public.remove_team_expense(uuid, uuid, text) from public;
revoke all on function public.team_expense_rows(uuid) from public;
revoke all on function public.get_team_expenses(uuid) from public;
grant execute on function public.remove_team_expense(uuid, uuid, text) to authenticated;
grant execute on function public.get_team_expenses(uuid) to authenticated;

notify pgrst, 'reload schema';
