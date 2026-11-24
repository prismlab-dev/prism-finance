-- Equipe ao vivo: o cliente recarrega a equipe quando membros, convites ou a
-- própria equipe mudam. A RLS de leitura já limita quem recebe cada evento.

do $$
declare
    team_table text;
begin
    foreach team_table in array array['teams', 'team_members', 'team_invites'] loop
        begin
            execute format('alter publication supabase_realtime add table public.%I', team_table);
        exception
            when duplicate_object then null;
            when undefined_object then null;
        end;
    end loop;
end $$;
