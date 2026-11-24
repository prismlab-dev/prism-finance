import { describe, expect, it } from "vitest";
import {
    DEFAULT_WALLET_ID,
    buildInvoicePaymentNote,
    normalizeBeneficiary,
    normalizeCategory,
    normalizeStoredTransaction,
    normalizeTag,
    normalizeTransactionGroup,
    toTransactionList,
    type StoredTransaction,
    type TransactionGroup,
} from "./financeCore";

const walletIds = new Set([DEFAULT_WALLET_ID, "w1", "w2"]);
const food = normalizeCategory({ id: "food", name: "Alimentação", type: "expense", color: "#f00" });
const market = normalizeCategory({ id: "market", name: "Mercado", type: "expense", parentId: "food" });
const ana = normalizeBeneficiary({ id: "ana", name: "Ana" });
const tagA = normalizeTag({ id: "tag-a", name: "Casa" });

function group(patch: Partial<TransactionGroup> = {}): TransactionGroup {
    return normalizeTransactionGroup({ id: "g", title: "Compra", type: "expense", sourceWalletId: "w1", categoryId: "market", beneficiaryId: "ana", ...patch }, walletIds);
}

function tx(patch: Partial<StoredTransaction> = {}): StoredTransaction {
    return normalizeStoredTransaction({ id: "t", groupId: "g", amount: 10, scheduledDate: "2026-01-05", createdAt: "2026-01-01T00:00:00.000Z", ...patch });
}

describe("toTransactionList", () => {
    it("resolve categoria com pai, beneficiário, carteira e tags existentes", () => {
        const [item] = toTransactionList(
            [tx()],
            [group()],
            [food, market],
            [ana],
            [tagA],
            [
                { transactionId: "t", tagId: "tag-a" },
                { transactionId: "t", tagId: "tag-a" },
                { transactionId: "t", tagId: "tag-removida" },
            ],
        );

        expect(item).toMatchObject({
            type: "spending",
            value: 10,
            inWallet: "w1",
            description: "Compra",
            paymentMethod: "wallet",
            beneficiary: "Ana",
            beneficiaryId: "ana",
            tagIds: ["tag-a"],
            systemKind: null,
            isNonCashSettlement: false,
            category: { id: "market", label: "Alimentação / Mercado", parentLabel: "Alimentação", type: "expense" },
        });
        expect(item.tags.map((tag) => tag.id)).toEqual(["tag-a"]);
    });

    it("sobrescritas da ocorrência vencem os padrões do grupo", () => {
        const [item] = toTransactionList([tx({ title: "Feira", categoryId: "food" })], [group()], [food, market], [ana], [], []);

        expect(item.description).toBe("Feira");
        expect(item.category).toMatchObject({ id: "food", label: "Alimentação", parentLabel: null });
    });

    it("usa os nomes guardados no grupo quando a categoria não existe mais", () => {
        const [item] = toTransactionList(
            [tx()],
            [group({ categoryId: "apagada", categoryName: "Lazer", subcategoryName: "Cinema", beneficiaryId: null, beneficiaryName: "Bia" })],
            [],
            [],
            [],
            [],
        );

        expect(item.category).toMatchObject({ id: null, label: "Lazer / Cinema", parentLabel: "Lazer", type: "expense" });
        expect(item.beneficiary).toBe("Bia");
    });

    it("compra de cartão é marcada como credit_card", () => {
        const [item] = toTransactionList([tx({ invoiceId: "c1-2026-01" })], [group({ creditCardId: "c1" })], [], [], [], []);

        expect(item).toMatchObject({ paymentMethod: "credit_card", creditCardId: "c1", invoiceId: "c1-2026-01" });
    });

    it("pagamento de fatura sem carteira vira liquidação sem caixa e sem carteira padrão", () => {
        const notes = buildInvoicePaymentNote({ invoiceId: "inv-1", creditCardId: "c1" });
        const [item] = toTransactionList([tx({ notes, status: "paid" })], [group({ sourceWalletId: null })], [], [], [], []);

        expect(item).toMatchObject({
            systemKind: "invoice_payment",
            paymentForInvoiceId: "inv-1",
            invoicePaymentMeta: { invoiceId: "inv-1", creditCardId: "c1" },
            isNonCashSettlement: true,
            inWallet: "",
        });
    });

    it("transação sem grupo é tratada como despesa na carteira padrão", () => {
        const [item] = toTransactionList([tx({ groupId: "sumiu" })], [], [], [], [], []);

        expect(item).toMatchObject({ type: "spending", inWallet: DEFAULT_WALLET_ID, description: "Transacao", beneficiary: "Eu" });
    });
});
