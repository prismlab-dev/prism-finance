import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PLANNING_STATE, normalizeInvoiceMonthOverrides, normalizePlanningState } from "./financeCore";

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
});

afterEach(() => {
    vi.useRealTimers();
});

describe("normalizePlanningState", () => {
    it("devolve o estado padrão para entrada que não é objeto", () => {
        expect(normalizePlanningState(null)).toBe(DEFAULT_PLANNING_STATE);
        expect(normalizePlanningState("lixo")).toBe(DEFAULT_PLANNING_STATE);
    });

    it("descarta despesas simuladas sem valor e só mantém parcelamento válido", () => {
        const planning = normalizePlanningState({
            simulatedExpenses: [
                { id: "zero", monthKey: "2026-07", amount: 0 },
                { id: "parcelada", monthKey: "2026-07", amount: 300, installmentCount: 3, createdAt: "2026-06-01T00:00:00.000Z" },
                { id: "parcela-invalida", monthKey: "2026-07", amount: 0.01, installmentCount: 3, createdAt: "2026-06-02T00:00:00.000Z" },
            ],
        });

        expect(planning.simulatedExpenses.map((expense) => expense.id)).toEqual(["parcelada", "parcela-invalida"]);
        expect(planning.simulatedExpenses[0].installmentCount).toBe(3);
        expect(planning.simulatedExpenses[1]).not.toHaveProperty("installmentCount");
    });

    it("ordena simulações por mês e depois por criação", () => {
        const planning = normalizePlanningState({
            simulatedIncomes: [
                { id: "ago", monthKey: "2026-08", amount: 10, createdAt: "2026-01-01T00:00:00.000Z" },
                { id: "jul-2", monthKey: "2026-07", amount: 10, createdAt: "2026-01-02T00:00:00.000Z" },
                { id: "jul-1", monthKey: "2026-07", amount: 10, createdAt: "2026-01-01T00:00:00.000Z" },
                { id: "nula", monthKey: "2026-07", amount: 0 },
            ],
        });

        expect(planning.simulatedIncomes.map((income) => income.id)).toEqual(["jul-1", "jul-2", "ago"]);
    });

    it("mantém uma seleção de desejo por item, a mais recente", () => {
        const planning = normalizePlanningState({
            wishlistSelections: [
                { id: "s1", wishItemId: "wish", monthKey: "2026-07", createdAt: "2026-01-01T00:00:00.000Z" },
                { id: "s2", wishItemId: "wish", monthKey: "2026-09", createdAt: "2026-02-01T00:00:00.000Z" },
                { id: "s3", wishItemId: "  ", monthKey: "2026-07" },
            ],
        });

        expect(planning.wishlistSelections.map((selection) => selection.id)).toEqual(["s2"]);
    });

    it("mantém só ids desabilitados de simulações existentes, sem duplicatas e ordenados", () => {
        const planning = normalizePlanningState({
            simulatedExpenses: [{ id: "e1", monthKey: "2026-07", amount: 5 }],
            disabledSimulatedExpenseIds: ["e1", "e1", "inexistente"],
            disabledIncomeIds: ["b", "a", "a", "", 3],
        });

        expect(planning.disabledSimulatedExpenseIds).toEqual(["e1"]);
        expect(planning.disabledIncomeIds).toEqual(["a", "b"]);
    });

    it("aceita só quantidades de meses suportadas na linha do tempo", () => {
        expect(normalizePlanningState({ timelineMonthCount: 6 }).timelineMonthCount).toBe(6);
        expect(normalizePlanningState({ timelineMonthCount: 7 }).timelineMonthCount).toBe(DEFAULT_PLANNING_STATE.timelineMonthCount);
    });

    it("migra reportsRange legado para um período que termina no mês atual", () => {
        expect(normalizePlanningState({ reportsRange: 3 }).reportsPeriod).toEqual({ startMonth: "2026-04", endMonth: "2026-06" });
    });

    it("limita o período ao mês atual e inverte início e fim trocados", () => {
        const planning = normalizePlanningState({ reportsPeriod: { startMonth: "2027-01", endMonth: "2026-02" } });

        expect(planning.reportsPeriod).toEqual({ startMonth: "2026-02", endMonth: "2026-06" });
    });

    it("guarda o último override de receita por mês", () => {
        const planning = normalizePlanningState({
            revenueOverrides: [
                { monthKey: "2026-08", amount: 10 },
                { monthKey: "2026-07", amount: 20 },
                { monthKey: "2026-07", amount: -5 },
            ],
        });

        expect(planning.revenueOverrides.map(({ monthKey, amount }) => ({ monthKey, amount }))).toEqual([
            { monthKey: "2026-07", amount: 0 },
            { monthKey: "2026-08", amount: 10 },
        ]);
    });
});

describe("normalizeInvoiceMonthOverrides", () => {
    it("mantém apenas pares com chave e mês AAAA-MM válidos, ordenados", () => {
        expect(normalizeInvoiceMonthOverrides({ b: "2026-02", a: "2026-13", c: 5, "": "2026-01", d: "2026-01" })).toEqual({ b: "2026-02", d: "2026-01" });
        expect(normalizeInvoiceMonthOverrides(["2026-01"])).toEqual({});
    });
});
