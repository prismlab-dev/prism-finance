import { describe, expect, it } from "vitest";
import { buildInstallmentPreview, customInstallmentAmounts, spreadInstallmentDifference } from "./installmentPreview";

const base = { amount: 1000, countInput: "3", startDate: "2026-11-30", showDay: true };

describe("buildInstallmentPreview", () => {
    it("divide o total, separa os centavos e avança um mês por parcela", () => {
        const preview = buildInstallmentPreview(base);
        expect(preview.rows.map((row) => [row.number, row.date, row.amount])).toEqual([
            [1, "2026-11-30", 333.34], [2, "2026-12-30", 333.33], [3, "2027-01-30", 333.33],
        ]);
        expect(preview.amountGroups).toEqual([{ amount: 333.34, count: 1 }, { amount: 333.33, count: 2 }]);
        expect(preview).toMatchObject({ lastDate: "2027-01-30", hint: null });
    });

    it("marca as primeiras parcelas como ignoradas", () => {
        const preview = buildInstallmentPreview({ ...base, amount: 1200, countInput: "12", ignoredCount: 7 });
        expect(preview).toMatchObject({ ignoredCount: 7, amountGroups: [{ amount: 100, count: 12 }] });
        expect(preview.rows.filter((row) => row.ignored).map((row) => row.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it("mostra os meses antes do valor e orienta quando falta algo", () => {
        expect(buildInstallmentPreview({ ...base, amount: 0 })).toMatchObject({ count: 3, amountGroups: [], hint: "Informe o valor total." });
        expect(buildInstallmentPreview({ ...base, amount: 0 }).rows).toHaveLength(3);
        expect(buildInstallmentPreview({ ...base, countInput: "1" })).toMatchObject({ rows: [], hint: "Informe pelo menos 2 parcelas." });
        expect(buildInstallmentPreview({ ...base, amount: 0.02 })).toMatchObject({ rows: [], hint: "Cada parcela precisa ter pelo menos R$ 0,01." });
        expect(buildInstallmentPreview({ ...base, startDate: "" })).toMatchObject({ rows: [] });
    });

    it("limita as linhas desenhadas", () => {
        const preview = buildInstallmentPreview({ ...base, countInput: "200" });
        expect([preview.rows.length, preview.hiddenCount]).toEqual([120, 80]);
    });
});

describe("valores personalizados", () => {
    const overrides = { 0: { amount: 500, manual: true } };

    it("substituem só a parcela digitada e apontam a diferença do total", () => {
        const preview = buildInstallmentPreview({ ...base, amount: 900, overrides });
        expect(preview.rows.map((row) => [row.amount, row.manual])).toEqual([[500, true], [300, false], [300, false]]);
        expect(preview).toMatchObject({ customized: true, installmentsTotal: 1100, difference: 200, canSpread: true, emptyNumbers: [] });
        expect(customInstallmentAmounts(900, 3, overrides)).toEqual([500, 300, 300]);
        expect(customInstallmentAmounts(900, 3, {})).toBeNull();
        expect(customInstallmentAmounts(900, 3, { 7: { amount: 1, manual: true } })).toBeNull();
    });

    it("ajustam as outras até fechar o total, com centavos", () => {
        const spread = spreadInstallmentDifference(1000, "3", { 0: { amount: 333.33, manual: true } });
        const preview = buildInstallmentPreview({ ...base, overrides: spread });
        expect(preview.rows.map((row) => row.amount)).toEqual([333.33, 333.34, 333.33]);
        expect(preview.difference).toBe(0);
        const one = spreadInstallmentDifference(100, "2", { 0: { amount: 30, manual: true } });
        expect(one[1]).toEqual({ amount: 70, manual: false });
    });

    it("não ajustam quando o digitado já passa do total ou não sobra parcela livre", () => {
        const tooMuch = { 0: { amount: 2000, manual: true } };
        expect(spreadInstallmentDifference(1000, "3", tooMuch)).toBe(tooMuch);
        const all = { 0: { amount: 1, manual: true }, 1: { amount: 1, manual: true } };
        expect(spreadInstallmentDifference(1000, "2", all)).toBe(all);
    });

    it("apontam parcelas sem valor", () => {
        expect(buildInstallmentPreview({ ...base, overrides: { 1: { amount: 0, manual: true } } }).emptyNumbers).toEqual([2]);
    });
});
