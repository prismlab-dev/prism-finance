import { describe, expect, it } from "vitest";
import { DEFAULT_EXPENSE_CATEGORY_ID, DEFAULT_INCOME_CATEGORY_ID, SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID } from "./constants";
import { normalizeFinanceSnapshot } from "./financeCore";

describe("categorias padrão da equipe", () => {
    it("livro vazio da equipe recebe categorias de empresa e mantém os ids de sistema", () => {
        const names = (seed?: "team") => normalizeFinanceSnapshot(null, "owner", { categorySeed: seed }).snapshot.categories;
        const team = names("team");
        const teamIds = team.map((category) => category.id);

        expect(team.map((category) => category.name)).toContain("Folha de pagamento");
        expect(team.map((category) => category.name)).not.toContain("Moradia");
        expect(teamIds).toEqual(expect.arrayContaining([DEFAULT_EXPENSE_CATEGORY_ID, DEFAULT_INCOME_CATEGORY_ID, SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID]));
        expect(names().map((category) => category.name)).toContain("Moradia");
    });
});
