import { describe, expect, it } from "vitest";
import { normalizeColumnOrder, normalizeColumnWidths } from "./tableColumnOrder";

const DEFAULTS = ["a", "b", "c", "d"] as const;

describe("tableColumnOrder", () => {
    it("normaliza ordem salva: remove inválidos/duplicados e adiciona colunas novas", () => {
        expect(normalizeColumnOrder(["c", "x", "a", "c"], DEFAULTS)).toEqual(["c", "a", "b", "d"]);
        expect(normalizeColumnOrder(undefined, DEFAULTS)).toEqual(["a", "b", "c", "d"]);
    });


    it("mantém apenas larguras válidas de colunas conhecidas", () => {
        expect(normalizeColumnWidths({ a: 20, b: 2, c: "30", x: 15 }, DEFAULTS)).toEqual({ a: 20 });
        expect(normalizeColumnWidths(null, DEFAULTS)).toEqual({});
    });
});
