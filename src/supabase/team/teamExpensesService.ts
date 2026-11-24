import type { TeamBalance, TeamExpenseEntry, TeamExpensesView } from "../../context/teamTypes";
import { getSupabaseClient } from "../supabaseClient";

interface TeamExpenseRow {
    transaction_id: string;
    group_id: string;
    payer_id: string;
    kind: "expense" | "income" | "settlement";
    mode: TeamExpenseEntry["mode"];
    title: string;
    amount: number | string;
    scheduled_date: string;
    status: string;
    from_member_id: string | null;
    shares: { memberId: string; amount: number | string; paid?: boolean }[];
    category_id: string | null;
    category_name: string | null;
    category_icon: string | null;
    category_color: string | null;
    /** Bloco de dados da equipe (migration 040); sem carteira, cartão ou saldo. */
    team_expense?: { note?: unknown } | null;
}

interface TeamExpensesRow {
    expenses: TeamExpenseRow[];
    balances: { member_id: string; net: number | string }[];
}

function fromExpenseRow(row: TeamExpenseRow): TeamExpenseEntry {
    return {
        transactionId: row.transaction_id,
        groupId: row.group_id,
        payerId: row.payer_id,
        kind: row.kind,
        mode: row.mode,
        title: row.title,
        amount: Number(row.amount),
        date: row.scheduled_date,
        status: row.status,
        fromMemberId: row.from_member_id,
        shares: (row.shares ?? []).map((share) => ({ memberId: share.memberId, amount: Number(share.amount), paid: share.paid === true })),
        category: row.category_id && row.category_name
            ? { id: row.category_id, name: row.category_name, icon: row.category_icon, color: row.category_color }
            : null,
        note: typeof row.team_expense?.note === "string" && row.team_expense.note.trim() ? row.team_expense.note : null,
    };
}

export async function loadTeamExpenses(teamId: string): Promise<TeamExpensesView> {
    const result = await getSupabaseClient().rpc("get_team_expenses", { target_team_id: teamId });
    if (result.error) throw result.error;
    const row = (result.data ?? { expenses: [], balances: [] }) as TeamExpensesRow;
    return {
        expenses: (row.expenses ?? []).map(fromExpenseRow),
        balances: (row.balances ?? []).map((balance): TeamBalance => ({ memberId: balance.member_id, net: Number(balance.net) })),
    };
}

export async function removeTeamExpense(teamId: string, payerId: string, groupId: string): Promise<void> {
    const result = await getSupabaseClient().rpc("remove_team_expense", { target_team_id: teamId, target_payer_id: payerId, target_group_id: groupId });
    if (result.error) throw result.error;
}
