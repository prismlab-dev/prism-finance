import { DEFAULT_BENEFICIARY_NAME } from "../domainConstants";
import type { LedgerEntry, StoredTransaction, TransactionGroup, TransactionStatus } from "../domainTypes";
import { asTransactionMode } from "../enumNormalization";
import { resolveGroupType } from "../helpers";
import { parseInvoicePaymentNote } from "../invoicePaymentNote";
import { resolveLedgerEntryDateIso } from "../ledgerDates";
import { parseRemovedInstallments } from "../removedInstallments";
import { parseRecurrenceRule } from "../recurrence/rule";
import { asDateString, asDateTimeString, asNullableString, asNumber, asString, getNowIso } from "../valueNormalization";
import { normalizeOptionalWalletId, normalizeWalletId } from "./walletNormalizers";
import { getLocalTodayDate } from "../../../lib/localDate";
import { roundToCents } from "../../../lib/primitives";

const TRANSACTION_STATUSES = new Set<TransactionStatus>(["pending", "paid", "cancelled", "skipped"]);

function asPositiveIntegerOrNull(value: unknown): number | null {
    return Number.isInteger(value) && Number(value) > 0 ? Number(value) : null;
}

export function normalizeTransactionStatus(status: unknown): TransactionStatus {
    if (typeof status === "boolean") {
        return status ? "paid" : "pending";
    }
    if (typeof status === "string" && TRANSACTION_STATUSES.has(status as TransactionStatus)) {
        return status as TransactionStatus;
    }
    return "pending";
}

export function normalizeTransactionGroup(group: Partial<TransactionGroup> & { id: string }, walletIds: Set<string>): TransactionGroup {
    const sourceWalletId = normalizeOptionalWalletId(asNullableString(group.sourceWalletId, null), walletIds);
    const destinationWalletId = normalizeOptionalWalletId(asNullableString(group.destinationWalletId, null), walletIds);

    return {
        id: asString(group.id, `group-${Date.now()}`),
        userId: asNullableString(group.userId, null),
        beneficiaryId: asNullableString(group.beneficiaryId, null),
        beneficiaryName: asString(group.beneficiaryName, DEFAULT_BENEFICIARY_NAME),
        categoryId: asNullableString(group.categoryId, null),
        categoryName: asString(group.categoryName, "Sem categoria"),
        subcategoryName: asNullableString(group.subcategoryName, null),
        title: asString(group.title, "Transacao"),
        notes: asNullableString(group.notes, null),
        type: resolveGroupType(group.type, asNumber(group.totalAmount, 0)),
        transactionMode: asTransactionMode(group.transactionMode),
        totalAmount: roundToCents(Math.abs(asNumber(group.totalAmount, 0))),
        installmentCount: asPositiveIntegerOrNull(group.installmentCount),
        ...parseRemovedInstallments(group.removedInstallments),
        recurrenceRule: parseRecurrenceRule(group.recurrenceRule),
        recurrenceEndDate: asNullableString(group.recurrenceEndDate, null),
        sourceWalletId,
        destinationWalletId,
        creditCardId: asNullableString(group.creditCardId, null),
        createdAt: asDateTimeString(group.createdAt, getNowIso()),
    };
}

export function normalizeStoredTransaction(transaction: Partial<StoredTransaction> & { id: string; groupId: string }): StoredTransaction {
    const now = getNowIso();
    const scheduledDate = asDateString(transaction.scheduledDate, getLocalTodayDate());
    const status = normalizeTransactionStatus(transaction.status);
    const paidAt = status === "paid" ? asDateTimeString(transaction.paidAt, resolveLedgerEntryDateIso(scheduledDate, now)) : null;

    return {
        id: asString(transaction.id, `tx-${Date.now()}`),
        groupId: asString(transaction.groupId, `group-${Date.now()}`),
        installmentNumber: asPositiveIntegerOrNull(transaction.installmentNumber),
        occurrenceNumber: asPositiveIntegerOrNull(transaction.occurrenceNumber),
        routingOverride: transaction.routingOverride === true,
        commitment: transaction.commitment === "forecast" ? "forecast" : "posted",
        ...(transaction.isProjected ? { isProjected: true } : {}),
        amount: roundToCents(Math.abs(asNumber(transaction.amount, 0))),
        scheduledDate,
        status,
        paidAt,
        invoiceId: asNullableString(transaction.invoiceId, null),
        paymentForInvoiceId: asNullableString(
            transaction.paymentForInvoiceId,
            parseInvoicePaymentNote(transaction.notes ?? null)?.invoiceId ?? null,
        ),
        notes: asNullableString(transaction.notes, null),
        title: asNullableString(transaction.title, null),
        categoryId: asNullableString(transaction.categoryId, null),
        beneficiaryId: asNullableString(transaction.beneficiaryId, null),
        sourceWalletId: asNullableString(transaction.sourceWalletId, null),
        destinationWalletId: asNullableString(transaction.destinationWalletId, null),
        creditCardId: asNullableString(transaction.creditCardId, null),
        createdAt: asDateTimeString(transaction.createdAt, now),
    };
}

export function normalizeLedgerEntry(entry: Partial<LedgerEntry> & { id: string; walletId: string }): LedgerEntry {
    return {
        id: asString(entry.id, `le-${Date.now()}`),
        walletId: normalizeWalletId(entry.walletId),
        transactionId: asNullableString(entry.transactionId, null),
        invoiceId: asNullableString(entry.invoiceId, null),
        amount: roundToCents(asNumber(entry.amount, 0)),
        balanceAfter: roundToCents(asNumber(entry.balanceAfter, 0)),
        description: asString(entry.description, "Lancamento"),
        createdAt: asDateTimeString(entry.createdAt, getNowIso()),
    };
}
