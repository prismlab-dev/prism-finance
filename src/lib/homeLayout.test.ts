import { describe, expect, it } from "vitest";
import { DEFAULT_HOME_LAYOUT, normalizeHomeLayout } from "./homeLayout";

describe("normalizeHomeLayout", () => {
    it("usa o padrão para valores inválidos", () => {
        expect(normalizeHomeLayout(null)).toEqual(DEFAULT_HOME_LAYOUT);
    });

    it("descarta desconhecidos e duplicados e devolve widgets ausentes à coluna padrão", () => {
        const layout = normalizeHomeLayout({ columns: [["balance", "x", "balance"], [], []], hidden: ["recent", "balance"] });
        expect(layout.columns).toEqual([["balance", "upcoming"], ["spending", "invoices"], ["wealth", "alerts"]]);
        expect(layout.hidden).toEqual(["recent"]);
    });
});
