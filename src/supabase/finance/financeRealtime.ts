import { toRevision } from "../../lib/primitives";
import { getSupabaseClient } from "../supabaseClient";
import { FINANCE_TABLES, type FinanceSyncStateRow } from "./financeTables";

export interface FinanceRevisionChange {
    revision: number;
    updatedAt: string;
    updatedBy: string | null;
}

function toRevisionChange(row: Partial<FinanceSyncStateRow> | null | undefined): FinanceRevisionChange | null {
    if (!row) {
        return null;
    }

    return {
        revision: toRevision(row.revision),
        updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
        updatedBy: typeof row.updated_by === "string" ? row.updated_by : null,
    };
}

export function subscribeToFinanceRevisionChanges(userId: string, onChange: (change: FinanceRevisionChange) => void): () => void {
    const client = getSupabaseClient();
    const channel = client
        .channel(`finance-sync-state:${userId}`)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: FINANCE_TABLES.syncState,
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                const change = toRevisionChange(payload.new as Partial<FinanceSyncStateRow> | null | undefined);
                if (change) {
                    onChange(change);
                }
            },
        )
        .subscribe();

    return () => {
        void client.removeChannel(channel);
    };
}
