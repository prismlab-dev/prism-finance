import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadCurrentTeam, subscribeToTeamChanges } from "../../supabase/team";
import { useFinanceActions, useFinanceBeneficiaries, useFinanceSession } from "../finance/hooks";
import { findTeamBeneficiary, syncedTeamBeneficiary } from "./teamBeneficiary";
import type { TeamSummary } from "../teamTypes";
import { cachedTeamCategories, fetchTeamCategories } from "./teamCategoriesCache";
import { fetchTeamExpenses } from "./teamExpensesCache";

interface TeamContextValue {
    team: TeamSummary | null;
    /** Verdadeiro até a primeira carga da equipe deste usuário terminar. */
    loading: boolean;
    refreshTeam: () => Promise<void>;
}

const TeamContext = createContext<TeamContextValue | null>(null);

// Última equipe vista por este usuário, para a tela abrir na hora enquanto a RPC confirma.
// Só cache: a resposta do banco sempre substitui o que estiver aqui.
const cacheKey = (userId: string) => `prism:team:${userId}`;

function readCachedTeam(userId: string | null): TeamSummary | null | undefined {
    if (!userId) return undefined;
    try {
        const raw = window.localStorage.getItem(cacheKey(userId));
        return raw === null ? undefined : (JSON.parse(raw) as TeamSummary | null);
    } catch {
        return undefined;
    }
}

function writeCachedTeam(userId: string, team: TeamSummary | null) {
    try {
        window.localStorage.setItem(cacheKey(userId), JSON.stringify(team));
    } catch {
        // Sem espaço ou sem acesso ao storage: só perde o atalho do próximo boot.
    }
}

export function TeamProvider({ children }: { children: ReactNode }) {
    const { user } = useFinanceSession();
    const userId = user?.uid ?? null;
    const [team, setTeam] = useState<TeamSummary | null>(null);
    const [loadedUserId, setLoadedUserId] = useState<string | null | undefined>(undefined);

    const refreshTeam = useCallback(async () => {
        const loaded = userId ? await loadCurrentTeam() : null;
        if (userId) writeCachedTeam(userId, loaded);
        setTeam(loaded);
    }, [userId]);

    useEffect(() => {
        const cached = readCachedTeam(userId);
        if (cached !== undefined) {
            setTeam(cached);
            setLoadedUserId(userId);
        }
        void refreshTeam().catch((error) => {
            console.error("Falha ao carregar a equipe:", error);
            setTeam(null);
        }).finally(() => setLoadedUserId(userId));
    }, [refreshTeam, userId]);

    // Mudanças feitas por outros membros (convites, papéis, remoções) chegam ao vivo.
    useEffect(() => {
        if (!userId) return;
        return subscribeToTeamChanges(userId, () => {
            void refreshTeam().catch((error) => console.error("Falha ao atualizar a equipe:", error));
        });
    }, [refreshTeam, userId]);

    // Despesas da equipe começam a carregar junto com o app, antes de abrir a página.
    const teamId = team?.id;
    useEffect(() => {
        if (teamId) void fetchTeamExpenses(teamId, true).catch(() => undefined);
    }, [teamId]);

    // Categorias do modal de despesa: o snapshot do livro da equipe é lento, então já vem no boot.
    useEffect(() => {
        if (team && !cachedTeamCategories(team.id)) void fetchTeamCategories(team).catch(() => undefined);
    }, [team]);

    // O beneficiário da equipe no livro pessoal acompanha nome e foto da equipe.
    const beneficiaries = useFinanceBeneficiaries();
    const { addBeneficiary } = useFinanceActions();
    useEffect(() => {
        if (!team) return;
        const existing = findTeamBeneficiary(beneficiaries, team);
        const synced = existing ? syncedTeamBeneficiary(existing, team) : null;
        if (synced) void addBeneficiary(synced).catch((error) => console.error("Falha ao sincronizar o beneficiário da equipe:", error));
    }, [addBeneficiary, beneficiaries, team]);

    const value = useMemo(() => ({ team, loading: loadedUserId !== userId, refreshTeam }), [team, loadedUserId, userId, refreshTeam]);
    return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam(): TeamContextValue {
    const context = useContext(TeamContext);
    if (!context) {
        throw new Error("useTeam must be used within a TeamProvider");
    }
    return context;
}

/** Id do beneficiário que representa a equipe no livro pessoal, se houver. */
export function useTeamBeneficiaryId(): string | null {
    const { team } = useTeam();
    const beneficiaries = useFinanceBeneficiaries();
    return useMemo(() => (team ? findTeamBeneficiary(beneficiaries, team)?.id ?? null : null), [beneficiaries, team]);
}
