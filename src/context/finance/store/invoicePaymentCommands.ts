import { DEFAULT_BENEFICIARY_NAME, SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID } from "../domainConstants";
import type { Beneficiary, CreditCard, CreditCardInvoice, FinanceSnapshot, InvoiceStatus } from "../domainTypes";
import type { PayCreditCardInvoiceDraft, UpdateInvoicePaymentTransactionDraft } from "../contextTypes";
import { normalizeCreditCardInvoice, normalizeWalletId } from "../entityNormalization/walletNormalizers";
import { normalizeStoredTransaction, normalizeTransactionGroup } from "../entityNormalization/transactionNormalizers";
import { ensureWalletId, findBeneficiaryByName, findCurrentUserSelfBeneficiary, getTodayDate, roundToCents } from "../helpers";
import { calculateCreditCardInvoiceOpenAmount, resolveCreditCardInvoiceStatus } from "../invoiceCycles";
import { buildInvoicePaymentNote, parseInvoicePaymentNote } from "../invoicePaymentNote";
import { createLedgerEntriesForPaidTransaction } from "../ledger";
import { resolveLedgerEntryDateIso } from "../ledgerDates";
import { parseAppDate } from "../../../lib/localDate";

type PaymentChanges = Pick<FinanceSnapshot, "transactionGroups" | "transactions" | "creditCardInvoices" | "ledgerEntries">;

function resolvePayerBeneficiary(beneficiaries: Beneficiary[], userId: string | null): Beneficiary | null {
    return findCurrentUserSelfBeneficiary(beneficiaries, userId) ?? findBeneficiaryByName(beneficiaries, DEFAULT_BENEFICIARY_NAME) ?? beneficiaries[0] ?? null;
}

function applyPaymentToInvoice(invoice: CreditCardInvoice, card: CreditCard | null, amount: number, paidAtIso: string, nowIso: string, creditCardIds: Set<string>): CreditCardInvoice {
    const paidAmount = roundToCents(Math.min(invoice.totalAmount, invoice.paidAmount + amount));
    const status: InvoiceStatus = card
        ? resolveCreditCardInvoiceStatus({
              invoiceCycleKey: invoice.cycleKey,
              cardClosingDay: card.closingDay,
              cardDueDay: card.dueDay,
              totalAmount: invoice.totalAmount,
              paidAmount,
          })
        : paidAmount >= invoice.totalAmount && invoice.totalAmount > 0
          ? "paid"
          : "open";

    return normalizeCreditCardInvoice({ ...invoice, paidAmount, status, paidAt: status === "paid" ? paidAtIso : null, updatedAt: nowIso }, creditCardIds);
}

/**
 * Pagamento (total ou parcial) de fatura: cria a transação de pagamento, abate da fatura
 * e debita a carteira. `walletId: null` liquida sem movimentar caixa. `null` = pagamento inválido.
 */
export function buildInvoicePayment(params: {
    snapshot: FinanceSnapshot;
    draft: PayCreditCardInvoiceDraft;
    userId: string | null;
    transactionId: string;
    nowIso: string;
}): PaymentChanges | null {
    const { snapshot, draft, userId, transactionId, nowIso } = params;
    const invoice = snapshot.creditCardInvoices.find((item) => item.id === draft.invoiceId);
    if (!invoice) {
        return null;
    }

    const amount = roundToCents(Number(draft.amount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > calculateCreditCardInvoiceOpenAmount(invoice)) {
        return null;
    }

    const walletId = draft.settleWithoutWallet || draft.walletId === null ? null : ensureWalletId(normalizeWalletId(draft.walletId), snapshot.wallets);
    if (walletId !== null && !snapshot.wallets.some((item) => item.id === walletId)) {
        return null;
    }

    const category =
        snapshot.categories.find((item) => item.id === SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID && item.type === "expense") ??
        snapshot.categories.find((item) => item.type === "expense") ??
        null;
    if (!category) {
        return null;
    }

    const paymentDate = parseAppDate(draft.paymentDate) ? draft.paymentDate : getTodayDate();
    const paidAtIso = resolveLedgerEntryDateIso(paymentDate, nowIso);
    const card = snapshot.creditCards.find((item) => item.id === invoice.creditCardId) ?? null;
    const categoryParent = category.parentId ? snapshot.categories.find((item) => item.id === category.parentId) ?? null : null;
    const beneficiary = resolvePayerBeneficiary(snapshot.beneficiaries, userId);
    const groupId = `group-${transactionId}`;
    const notes = buildInvoicePaymentNote({ invoiceId: invoice.id, creditCardId: invoice.creditCardId });

    const group = normalizeTransactionGroup(
        {
            id: groupId,
            userId,
            beneficiaryId: beneficiary?.id ?? null,
            beneficiaryName: beneficiary?.name ?? DEFAULT_BENEFICIARY_NAME,
            categoryId: category.id,
            categoryName: categoryParent?.name ?? category.name,
            subcategoryName: categoryParent ? category.name : null,
            title: `Fatura do ${card?.name ?? "cartão de crédito"}`,
            notes,
            type: "expense",
            transactionMode: "single",
            totalAmount: amount,
            installmentCount: null,
            recurrenceRule: null,
            recurrenceEndDate: null,
            sourceWalletId: walletId,
            destinationWalletId: null,
            creditCardId: null,
            createdAt: nowIso,
        },
        new Set(snapshot.wallets.map((item) => item.id)),
    );
    const transaction = normalizeStoredTransaction({
        id: transactionId,
        groupId,
        installmentNumber: null,
        amount,
        scheduledDate: paymentDate,
        status: "paid",
        paidAt: paidAtIso,
        invoiceId: null,
        paymentForInvoiceId: invoice.id,
        notes,
        createdAt: nowIso,
    });

    const creditCardIds = new Set(snapshot.creditCards.map((item) => item.id));
    return {
        transactionGroups: [...snapshot.transactionGroups, group],
        transactions: [...snapshot.transactions, transaction],
        creditCardInvoices: snapshot.creditCardInvoices.map((item) => (item.id === invoice.id ? applyPaymentToInvoice(item, card, amount, paidAtIso, nowIso, creditCardIds) : item)),
        ledgerEntries: [...snapshot.ledgerEntries, ...createLedgerEntriesForPaidTransaction(transaction, group)],
    };
}

/** Edita descrição, beneficiário e data de um pagamento de fatura, refazendo seus lançamentos. */
export function buildInvoicePaymentEdit(params: {
    snapshot: FinanceSnapshot;
    draft: UpdateInvoicePaymentTransactionDraft;
    userId: string | null;
    nowIso: string;
}): Omit<PaymentChanges, "creditCardInvoices"> | null {
    const { snapshot, draft, userId, nowIso } = params;
    const transaction = snapshot.transactions.find((item) => item.id === draft.transactionId);
    const meta = transaction ? parseInvoicePaymentNote(transaction.notes) : null;
    const group = transaction ? snapshot.transactionGroups.find((item) => item.id === transaction.groupId) : undefined;
    if (!transaction || !meta || !group) {
        return null;
    }

    const date = parseAppDate(draft.date) ? draft.date : transaction.scheduledDate;
    const requestedBeneficiaryId = draft.beneficiaryId?.trim() ?? "";
    const beneficiary =
        (requestedBeneficiaryId ? snapshot.beneficiaries.find((item) => item.id === requestedBeneficiaryId) : null) ??
        resolvePayerBeneficiary(snapshot.beneficiaries, userId);

    const nextGroup = normalizeTransactionGroup(
        {
            ...group,
            beneficiaryId: beneficiary?.id ?? group.beneficiaryId,
            beneficiaryName: beneficiary?.name ?? group.beneficiaryName,
            title: draft.description.trim() || group.title || "Pagamento de fatura",
            notes: group.notes || buildInvoicePaymentNote(meta),
        },
        new Set(snapshot.wallets.map((wallet) => wallet.id)),
    );
    const nextTransaction = normalizeStoredTransaction({
        ...transaction,
        scheduledDate: date,
        status: "paid",
        paidAt: resolveLedgerEntryDateIso(date, transaction.paidAt ?? nowIso),
        notes: transaction.notes || buildInvoicePaymentNote(meta),
    });

    return {
        transactionGroups: snapshot.transactionGroups.map((item) => (item.id === nextGroup.id ? nextGroup : item)),
        transactions: snapshot.transactions.map((item) => (item.id === nextTransaction.id ? nextTransaction : item)),
        ledgerEntries: [
            ...snapshot.ledgerEntries.filter((item) => item.transactionId !== nextTransaction.id),
            ...createLedgerEntriesForPaidTransaction(nextTransaction, nextGroup),
        ],
    };
}
