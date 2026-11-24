import { describe, expect, it } from "vitest";
import type { Transaction } from "../../context/FinanceContext";
import { buildShareMessage } from "./shareTransactionMessage";

const transaction = {
    id: "t1",
    type: "spending",
    value: 1249.9,
    date: "2026-11-20",
    description: "Jantar",
    category: { id: "c", label: "Restaurantes", parentLabel: "Alimentação", icon: "", color: null, type: "expense" },
} as Transaction;

describe("buildShareMessage", () => {
    it("resume a transação pessoal com o link", () => {
        expect(buildShareMessage({ transaction, link: "https://app/x" })).toBe(
            "Jantar: R$ 1.249,90\nDespesa em Restaurantes, 20/11/2026\n\nAbrir no Silus: https://app/x",
        );
    });

    it("lista só quem ainda falta pagar na equipe", () => {
        const message = buildShareMessage({
            transaction,
            link: "https://app/x",
            teamName: "Produto",
            team: {
                payerName: "Ana",
                status: "paid",
                category: { name: "Eventos", icon: null, color: null },
                shares: [
                    { memberId: "a", name: "Ana", photoUrl: null, amount: 416.63, paid: false, isPayer: true },
                    { memberId: "b", name: "Bruno", photoUrl: null, amount: 416.63, paid: true, isPayer: false },
                    { memberId: "c", name: "Carla", photoUrl: null, amount: 416.64, paid: false, isPayer: false },
                ],
            },
        });
        expect(message).toContain("Despesa da equipe Produto em Eventos");
        expect(message).toContain("Pago por Ana");
        expect(message).toContain("Falta pagar: Carla (R$ 416,64)");
        expect(message).not.toContain("Bruno");
    });
});
