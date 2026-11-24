-- O filtro por equipe comparava texto, e o índice de 035 é sobre o uuid: cada
-- chamada varria todos os grupos de todos os usuários. Comparar o uuid (e repetir
-- o predicado do índice parcial) deixa o planner usar transaction_groups_team_expense_idx.

do $$ declare definition text; revised text;
begin
    definition := pg_get_functiondef('public.team_expense_rows(uuid)'::regprocedure);
    revised := replace(definition,
        'where g.team_expense ->> ''teamId'' = target_team_id::text',
        'where g.team_expense is not null and (g.team_expense ->> ''teamId'')::uuid = target_team_id');
    if revised = definition then raise exception 'Unexpected team_expense_rows shape'; end if;
    execute revised;
end; $$;

notify pgrst, 'reload schema';
