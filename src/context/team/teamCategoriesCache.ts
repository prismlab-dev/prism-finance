import type { Category } from "../finance/domainTypes";
import { normalizeFinanceSnapshot } from "../finance/financeCore";
import { toSupabaseFinanceData } from "../finance/useFinanceSyncQueue";
import type { TeamSummary } from "../teamTypes";
import { createEmptySupabaseFinanceData, loadSupabaseFinanceData, saveSupabaseFinanceData } from "../../supabase/finance";

// O snapshot do livro da equipe só serve aqui para as categorias, que quase não mudam:
// guarda o resultado por equipe para o modal abrir já com a lista. Só cache.
const cachedCategories = new Map<string, Category[]>();
const inFlight = new Map<string, Promise<Category[]>>();

/**
 * Categorias do livro da equipe. Na primeira vez que um editor abre, o livro vazio
 * recebe as categorias de empresa (categorySeed "team") pela mesma RPC de escrita.
 */
async function loadTeamCategories(team: TeamSummary): Promise<Category[]> {
    const loaded = await loadSupabaseFinanceData(team.id, undefined, team.id);
    let data = loaded.data;
    if (!data && team.currentUserRole !== "viewer") {
        const seed = normalizeFinanceSnapshot(null, team.id, { categorySeed: "team", defaultBeneficiaryName: team.name }).snapshot;
        const saved = await saveSupabaseFinanceData({
            userId: team.id,
            teamId: team.id,
            financeData: toSupabaseFinanceData(seed, null),
            baseData: createEmptySupabaseFinanceData(),
            baseRevision: loaded.revision,
            clientId: `team-category-seed:${team.id}`,
        });
        data = saved.data;
    }
    return data?.categories ?? [];
}

export function fetchTeamCategories(team: TeamSummary): Promise<Category[]> {
    const pending = inFlight.get(team.id);
    if (pending) return pending;
    const request = loadTeamCategories(team)
        .then((categories) => {
            cachedCategories.set(team.id, categories);
            return categories;
        })
        .finally(() => inFlight.delete(team.id));
    inFlight.set(team.id, request);
    return request;
}

export const cachedTeamCategories = (teamId: string) => cachedCategories.get(teamId);
