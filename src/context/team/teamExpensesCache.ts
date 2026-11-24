import type { TeamExpensesView } from "../teamTypes";
import { loadTeamExpenses } from "../../supabase/team";

// Última projeção por equipe: trocar entre visão geral e transações mostra o que já veio
// e atualiza por baixo, sem voltar ao skeleton. Só cache; o banco continua sendo a fonte.
const cachedViews = new Map<string, TeamExpensesView>();
const inFlight = new Map<string, Promise<TeamExpensesView>>();

/**
 * Busca e guarda no cache. `reuseInFlight` só serve para a primeira carga (pré-carga da
 * equipe); depois de uma escrita a busca tem que ser nova, não uma anterior a ela.
 */
export function fetchTeamExpenses(teamId: string, reuseInFlight = false): Promise<TeamExpensesView> {
    const pending = inFlight.get(teamId);
    if (pending && reuseInFlight) return pending;
    const request = loadTeamExpenses(teamId)
        .then((view) => {
            cachedViews.set(teamId, view);
            return view;
        })
        .finally(() => {
            if (inFlight.get(teamId) === request) inFlight.delete(teamId);
        });
    inFlight.set(teamId, request);
    return request;
}

export const cachedTeamExpenses = (teamId: string) => cachedViews.get(teamId);
