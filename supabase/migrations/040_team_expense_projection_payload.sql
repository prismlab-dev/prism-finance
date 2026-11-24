-- A projeção da equipe devolve também o bloco team_expense inteiro (divisão, partes
-- pagas, categoria, status e observação da equipe). Ele só tem dados de equipe, nunca
-- carteira, cartão ou saldo; campos novos nele chegam à equipe sem outra migration.

drop function if exists public.team_expense_rows(uuid);

create or replace function public.team_expense_rows(target_team_id uuid)
returns table(
    transaction_id text, group_id text, payer_id uuid, kind text, mode text, title text, amount numeric,
    scheduled_date date, status text, from_member_id uuid, shares jsonb,
    category_id text, category_name text, category_icon text, category_color text, team_expense jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select t.id, g.id, g.user_id, g.team_expense ->> 'kind', g.team_expense ->> 'mode',
           coalesce(t.title, g.title), t.amount, t.scheduled_date, coalesce(g.team_expense ->> 'teamStatus', t.status),
           (g.team_expense ->> 'fromMemberId')::uuid,
           coalesce((
               select jsonb_agg(jsonb_build_object('memberId', s ->> 'memberId', 'paid', s ? 'paidAt', 'amount', round(
                   case g.team_expense ->> 'mode'
                       when 'equal' then t.amount / jsonb_array_length(g.team_expense -> 'shares')
                       when 'percent' then t.amount * (s ->> 'value')::numeric / 100
                       else (s ->> 'value')::numeric * t.amount / nullif(g.total_amount, 0)
                   end, 2)))
                 from jsonb_array_elements(g.team_expense -> 'shares') s
           ), '[]'::jsonb),
           c.id, c.name, c.icon, c.color, g.team_expense
      from public.transaction_groups g
      join public.transactions t on t.user_id = g.user_id and t.group_id = g.id
      left join public.categories c on c.user_id = target_team_id and c.id = g.team_expense ->> 'categoryId'
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
                'status', r.status, 'from_member_id', r.from_member_id, 'shares', r.shares,
                'category_id', r.category_id, 'category_name', r.category_name, 'category_icon', r.category_icon, 'category_color', r.category_color,
                'team_expense', r.team_expense
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
                         where r.kind = 'expense' and (s ->> 'memberId')::uuid <> r.payer_id and not (s ->> 'paid')::boolean
                        union all
                        select (s ->> 'memberId')::uuid, -(s ->> 'amount')::numeric
                          from public.team_expense_rows(target_team_id) r, jsonb_array_elements(r.shares) s
                         where r.kind = 'expense' and (s ->> 'memberId')::uuid <> r.payer_id and not (s ->> 'paid')::boolean
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

revoke all on function public.team_expense_rows(uuid) from public;
revoke all on function public.get_team_expenses(uuid) from public;
grant execute on function public.get_team_expenses(uuid) to authenticated;

notify pgrst, 'reload schema';
