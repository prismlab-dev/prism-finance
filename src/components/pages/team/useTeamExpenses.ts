import { useCallback, useEffect, useRef, useState } from "react";
import { useFinanceSync } from "../../../context/FinanceContext";
import type { TeamExpensesView } from "../../../context/teamTypes";
import { cachedTeamExpenses, fetchTeamExpenses } from "../../../context/team/teamExpensesCache";

const EMPTY_VIEW: TeamExpensesView = { expenses: [], balances: [] };

/** Projeção da equipe; recarrega quando o livro pessoal termina de sincronizar e ao voltar para a aba. */
export function useTeamExpenses(teamId: string) {
    const { status } = useFinanceSync();
    const [view, setView] = useState<TeamExpensesView>(() => cachedTeamExpenses(teamId) ?? EMPTY_VIEW);
    const [loading, setLoading] = useState(() => !cachedTeamExpenses(teamId));
    const [error, setError] = useState<string | null>(null);
    const previousStatus = useRef(status);

    const refresh = useCallback(async (reuseInFlight = false) => {
        try {
            setView(await fetchTeamExpenses(teamId, reuseInFlight));
            setError(null);
        } catch (loadError) {
            console.error("Failed to load team expenses:", loadError);
            setError("Não foi possível carregar as despesas da equipe.");
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        void refresh(true);
        const handleFocus = () => void refresh();
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [refresh]);

    useEffect(() => {
        if (previousStatus.current !== "synced" && status === "synced") void refresh();
        previousStatus.current = status;
    }, [refresh, status]);

    return { view, loading, error, refresh };
}
