import { describe, expect, it } from "vitest";
import type { TeamExpenseEntry } from "../../../context/teamTypes";
import { normalizeTeamExpensesTableView, sortTeamExpenses } from "./teamExpensesTableView";

const entry = (id: string, date: string, amount: number, title: string): TeamExpenseEntry => ({
    transactionId: id, groupId: id, payerId: "p", kind: "expense", mode: "equal", title, amount, date,
    status: "paid", fromMemberId: null, shares: [], category: null, note: null,
});

describe("tabela de despesas da equipe", () => {
    const rows = [entry("a", "2026-11-02", 50, "Beta"), entry("b", "2026-11-10", 20, "alfa")];

    it("ordena por valor e por descrição sem diferenciar maiúsculas", () => {
        expect(sortTeamExpenses(rows, { sortField: "value", sortDirection: "desc" }, () => "").map((row) => row.transactionId)).toEqual(["a", "b"]);
        expect(sortTeamExpenses(rows, { sortField: "description", sortDirection: "asc" }, () => "").map((row) => row.transactionId)).toEqual(["b", "a"]);
    });

    it("descarta preferências inválidas", () => {
        const view = normalizeTeamExpensesTableView({ hiddenColumns: ["value", "x"], sortField: "nope", columnOrder: ["value"] });
        expect(view.hiddenColumns).toEqual(["value"]);
        expect(view.sortField).toBe("date");
        expect(view.columnOrder[0]).toBe("value");
    });
});
