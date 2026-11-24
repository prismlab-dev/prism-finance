import { describe, expect, it } from "vitest";
import { formatMonthLabel, getCurrentMonthKey, monthKeyToDate, parseMonthKey, shiftMonth } from "./monthKey";

describe("monthKey", () => {
    it("gera a chave do mês com zero à esquerda", () => {
        expect(getCurrentMonthKey(new Date(2026, 0, 15))).toBe("2026-01");
        expect(getCurrentMonthKey(new Date(2026, 11, 31))).toBe("2026-12");
    });

    it("faz parse apenas de chaves válidas", () => {
        expect(parseMonthKey(" 2026-03 ")).toEqual({ year: 2026, monthIndex: 2 });
        expect(parseMonthKey("2026-13")).toBeNull();
        expect(parseMonthKey("2026-00")).toBeNull();
        expect(parseMonthKey("2026-3")).toBeNull();
        expect(monthKeyToDate("abc")).toBeNull();
        expect(monthKeyToDate("2026-03")?.getMonth()).toBe(2);
    });

    it("desloca meses atravessando o ano", () => {
        expect(shiftMonth("2026-01", -1)).toBe("2025-12");
        expect(shiftMonth("2026-12", 1)).toBe("2027-01");
        expect(shiftMonth("2026-03", 14)).toBe("2027-05");
    });

    it("usa o mês atual quando a chave é inválida", () => {
        expect(shiftMonth("invalido", 1)).toBe(getCurrentMonthKey());
    });

    it("formata o rótulo capitalizado ou devolve a chave inválida", () => {
        expect(formatMonthLabel("2026-03")).toMatch(/^Março/);
        expect(formatMonthLabel("xx")).toBe("xx");
    });
});
