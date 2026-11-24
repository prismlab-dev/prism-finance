import type { TeamExpenseEntry } from "../../../context/teamTypes";
import { normalizeColumnOrder, normalizeColumnWidths } from "../../common/tableColumnOrder";

export type TeamExpenseColumn = "status" | "shares" | "date" | "description" | "category" | "payer" | "value";
export type TeamExpenseSortDirection = "asc" | "desc";

export const TEAM_EXPENSE_COLUMNS: TeamExpenseColumn[] = ["status", "shares", "date", "description", "category", "payer", "value"];

export const TEAM_EXPENSE_COLUMN_LABELS: Record<TeamExpenseColumn, string> = {
    status: "Status",
    shares: "Quem paga",
    date: "Data",
    description: "Descrição",
    category: "Categoria",
    payer: "Pago por",
    value: "Valor",
};

/** Largura padrão em %; a descrição ocupa o que sobra. */
export const TEAM_EXPENSE_DEFAULT_WIDTHS: Partial<Record<TeamExpenseColumn, number>> = {
    status: 10, shares: 12, date: 9, category: 18, payer: 15, value: 13,
};

export interface TeamExpensesTableView {
    columnOrder: TeamExpenseColumn[];
    columnWidths: Partial<Record<TeamExpenseColumn, number>>;
    hiddenColumns: TeamExpenseColumn[];
    sortField: TeamExpenseColumn;
    sortDirection: TeamExpenseSortDirection;
}

export const TEAM_EXPENSES_TABLE_VIEW_SECTION = "team-expenses.table-view";

export const DEFAULT_TEAM_EXPENSES_TABLE_VIEW: TeamExpensesTableView = {
    columnOrder: TEAM_EXPENSE_COLUMNS,
    columnWidths: {},
    hiddenColumns: [],
    sortField: "date",
    sortDirection: "desc",
};

/** Ordem salva antes da coluna "Quem paga" existir: ela entra logo depois de Status. */
function withSharesAfterStatus(saved: unknown): TeamExpenseColumn[] {
    const order = normalizeColumnOrder(saved, TEAM_EXPENSE_COLUMNS);
    if (!Array.isArray(saved) || saved.includes("shares")) return order;
    const withoutShares: TeamExpenseColumn[] = order.filter((column) => column !== "shares");
    withoutShares.splice(withoutShares.indexOf("status") + 1, 0, "shares");
    return withoutShares;
}

function isColumn(value: unknown): value is TeamExpenseColumn {
    return typeof value === "string" && (TEAM_EXPENSE_COLUMNS as string[]).includes(value);
}

export function normalizeTeamExpensesTableView(value: unknown): TeamExpensesTableView {
    if (typeof value !== "object" || value === null) return DEFAULT_TEAM_EXPENSES_TABLE_VIEW;
    const raw = value as Record<string, unknown>;
    return {
        columnOrder: withSharesAfterStatus(raw.columnOrder),
        columnWidths: normalizeColumnWidths(raw.columnWidths, TEAM_EXPENSE_COLUMNS),
        hiddenColumns: Array.isArray(raw.hiddenColumns) ? raw.hiddenColumns.filter(isColumn) : [],
        sortField: isColumn(raw.sortField) ? raw.sortField : DEFAULT_TEAM_EXPENSES_TABLE_VIEW.sortField,
        sortDirection: raw.sortDirection === "asc" ? "asc" : "desc",
    };
}

/** Texto ou número usado para ordenar cada coluna. */
function sortKey(expense: TeamExpenseEntry, field: TeamExpenseColumn, nameOf: (memberId: string) => string): string | number {
    switch (field) {
        case "status": return expense.status;
        case "date": return expense.date;
        case "description": return expense.title.toLocaleLowerCase("pt-BR");
        case "category": return expense.category?.name.toLocaleLowerCase("pt-BR") ?? "";
        case "payer": return nameOf(expense.kind === "settlement" ? expense.fromMemberId ?? "" : expense.payerId).toLocaleLowerCase("pt-BR");
        case "shares": return expense.shares.filter((share) => share.memberId !== expense.payerId).length;
        case "value": return expense.amount;
    }
}

export function sortTeamExpenses(expenses: TeamExpenseEntry[], view: Pick<TeamExpensesTableView, "sortField" | "sortDirection">, nameOf: (memberId: string) => string): TeamExpenseEntry[] {
    const sign = view.sortDirection === "asc" ? 1 : -1;
    return [...expenses].sort((a, b) => {
        const left = sortKey(a, view.sortField, nameOf);
        const right = sortKey(b, view.sortField, nameOf);
        const compared = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "pt-BR");
        return compared * sign || b.date.localeCompare(a.date);
    });
}
