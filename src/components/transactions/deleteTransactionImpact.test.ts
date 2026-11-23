import { describe, expect, it } from "vitest";
import type { Transaction } from "../../context/FinanceContext";
import { fixtureCard, fixtureGroup, fixtureTransaction, fixtureWallet } from "../../context/finance/financeTestFixtures";
import { buildDeleteTransactionImpactPreview } from "./deleteTransactionImpact";

describe("buildDeleteTransactionImpactPreview", () => {
    it("conta o débito da parcela movida do cartão para uma carteira", () => {
        const group = fixtureGroup({ transactionMode: "installment", creditCardId: fixtureCard.id });
        const paid = fixtureTransaction({ installmentNumber: 1, routingOverride: true, creditCardId: null, sourceWalletId: fixtureWallet.id, status: "paid" });
        const preview = buildDeleteTransactionImpactPreview({
            transaction: { id: paid.id, groupId: group.id } as Transaction,
            scope: "all",
            storedTransactions: [paid],
            transactionGroups: [group],
            wallets: [fixtureWallet],
        });
        expect(preview).toMatchObject({ paidTransactionsCount: 1, balanceDelta: 100 });
    });
});
