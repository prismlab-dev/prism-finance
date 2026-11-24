import { getSupabaseClient } from "../supabaseClient";

const TEAM_TABLES = ["teams", "team_members", "team_invites"] as const;

// Sem filtro por equipe: a RLS já restringe inserts/updates aos membros, e
// deletes só chegam (com a chave primária) a assinaturas sem filtro.
export function subscribeToTeamChanges(userId: string, onChange: () => void): () => void {
    const client = getSupabaseClient();
    const channel = TEAM_TABLES.reduce(
        (current, table) => current.on("postgres_changes", { event: "*", schema: "public", table }, () => onChange()),
        client.channel(`team-sync:${userId}`),
    ).subscribe();

    return () => {
        void client.removeChannel(channel);
    };
}
