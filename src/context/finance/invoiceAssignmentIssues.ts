import type { CreditCard, StoredTransaction, TransactionGroup } from "./domainTypes";
import { buildCreditCardInvoiceId, resolveCreditCardInvoiceCycle } from "./invoiceCycles";
import { resolveTransactionCreditCardId } from "./transactionResolution";

export interface CreditCardInvoiceAssignmentIssue {
    transactionId: string;
    creditCardId: string;
    currentInvoiceId: string | null;
    expectedInvoiceId: string;
    expectedCycleKey: string;
    expectedClosingDate: string;
    expectedDueDate: string;
}

/** Compras de cartão cuja fatura gravada difere da fatura que a data da compra indica. */
export function findCreditCardInvoiceAssignmentIssues(params: {
    transactions: Pick<StoredTransaction, "id" | "groupId" | "scheduledDate" | "invoiceId" | "status" | "creditCardId">[];
    transactionGroups: Pick<TransactionGroup, "id" | "type" | "creditCardId">[];
    creditCards: Pick<CreditCard, "id" | "closingDay" | "dueDay">[];
}): CreditCardInvoiceAssignmentIssue[] {
    const groupById = new Map(params.transactionGroups.map((group) => [group.id, group]));
    const cardById = new Map(params.creditCards.map((card) => [card.id, card]));
    const issues: CreditCardInvoiceAssignmentIssue[] = [];

    params.transactions.forEach((transaction) => {
        if (transaction.status === "cancelled") {
            return;
        }

        const group = groupById.get(transaction.groupId);
        const creditCardId = resolveTransactionCreditCardId(transaction, group);
        if (!group || group.type !== "expense" || !creditCardId) {
            return;
        }

        const creditCard = cardById.get(creditCardId);
        if (!creditCard) {
            return;
        }

        const expectedCycle = resolveCreditCardInvoiceCycle(transaction.scheduledDate, creditCard.closingDay, creditCard.dueDay);
        const expectedInvoiceId = buildCreditCardInvoiceId(creditCard.id, expectedCycle.cycleKey);
        if (transaction.invoiceId === expectedInvoiceId) {
            return;
        }

        issues.push({
            transactionId: transaction.id,
            creditCardId: creditCard.id,
            currentInvoiceId: transaction.invoiceId,
            expectedInvoiceId,
            expectedCycleKey: expectedCycle.cycleKey,
            expectedClosingDate: expectedCycle.closingDate,
            expectedDueDate: expectedCycle.dueDate,
        });
    });

    return issues;
}
