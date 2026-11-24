import { useEffect, useState } from "react";
import type { Category } from "../../../context/FinanceContext";
import { cachedTeamCategories, fetchTeamCategories } from "../../../context/team/teamCategoriesCache";
import type { TeamSummary } from "../../../context/teamTypes";

/** Categorias do livro da equipe: mostra o cache na hora e confirma com o banco por baixo. */
export function useTeamCategories(team: TeamSummary) {
    const [categories, setCategories] = useState<Category[]>(() => cachedTeamCategories(team.id) ?? []);
    const [loading, setLoading] = useState(() => !cachedTeamCategories(team.id));

    useEffect(() => {
        let active = true;
        fetchTeamCategories(team)
            .then((loaded) => {
                if (active) setCategories(loaded);
            })
            .catch((error) => console.error("Failed to load team categories:", error))
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [team]);

    return { categories, loading };
}
