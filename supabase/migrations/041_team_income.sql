-- Receita da equipe: um membro recebe na própria carteira (receita pessoal) e divide.
-- team_expense.kind = 'income' usa a mesma divisão da despesa, mas os saldos se
-- invertem: quem recebeu deve a parte de cada membro, até confirmar o repasse (paidAt).

do $$ declare definition text; revised text; step text[];
begin
    definition := pg_get_functiondef('public.validate_team_expense()'::regprocedure);
    foreach step slice 1 in array array[
        ['if expense ->> ''kind'' <> ''expense'' or new.type <> ''expense''',
         'if expense ->> ''kind'' not in (''expense'', ''income'') or new.type <> expense ->> ''kind''']
    ] loop
        revised := replace(definition, step[1], step[2]);
        if revised = definition then raise exception 'Unexpected team expense validator shape: %', step[1]; end if;
        definition := revised;
    end loop;
    execute definition;

    definition := pg_get_functiondef('public.get_team_expenses(uuid)'::regprocedure);
    foreach step slice 1 in array array[
        -- Despesa: quem pagou tem a receber. Receita: quem recebeu tem a repassar.
        ['select r.payer_id as member_id, (s ->> ''amount'')::numeric as delta',
         'select r.payer_id as member_id, (case r.kind when ''income'' then -1 else 1 end) * (s ->> ''amount'')::numeric as delta'],
        ['select (s ->> ''memberId'')::uuid, -(s ->> ''amount'')::numeric',
         'select (s ->> ''memberId'')::uuid, (case r.kind when ''income'' then 1 else -1 end) * (s ->> ''amount'')::numeric'],
        ['where r.kind = ''expense'' and (s ->> ''memberId'')::uuid <> r.payer_id',
         'where r.kind in (''expense'', ''income'') and (s ->> ''memberId'')::uuid <> r.payer_id']
    ] loop
        revised := replace(definition, step[1], step[2]);
        if revised = definition then raise exception 'Unexpected team balance shape: %', step[1]; end if;
        definition := revised;
    end loop;
    execute definition;
end; $$;

notify pgrst, 'reload schema';
