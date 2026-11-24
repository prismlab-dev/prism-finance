import { DEFAULT_BENEFICIARY_NAME, DEFAULT_WALLET_ID } from "../domainConstants";
import type { LedgerEntry, StoredTransaction, TransactionGroup } from "../domainTypes";
import { asTransactionMode } from "../enumNormalization";
import { normalizeWalletId } from "../entityNormalization/walletNormalizers";
import { normalizeStoredTransaction, normalizeTransactionGroup, normalizeTransactionStatus } from "../entityNormalization/transactionNormalizers";
import { resolveGroupType } from "../helpers";
import { createLedgerEntriesForPaidTransaction } from "../ledger";
import { parseRemovedInstallments } from "../removedInstallments";
import { parseRecurrenceRule } from "../recurrence/rule";
import { resolveTransactionCreditCardId } from "../transactionResolution";
import { asDateString, asDateTimeString, asNullableString, asNumber, asString } from "../valueNormalization";
import { collectRawRecords, normalizeRecordsById, type RawRecord, type SectionResult } from "./recordSections";
import type { NormalizationClock } from "./walletSections";
import { isRecord } from "../../../lib/primitives";

interface TransactionContext extends NormalizationClock {
    userId: string | null;
    walletIds: Set<string>;
}

function asWalletId(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }
    if (isRecord(value) && typeof value.id === "string") {
        return value.id;
    }
    return DEFAULT_WALLET_ID;
}

function legacyCategoryNames(rawTransaction: RawRecord): { categoryName: string; subcategoryName: string | null } {
    const category = isRecord(rawTransaction.category) ? rawTransaction.category : null;
    return {
        categoryName: category ? asString(category.principal, "Sem categoria") : "Sem categoria",
        subcategoryName: category ? asNullableString(category.sub, null) : null,
    };
}

/** Grupo de transação avulsa, usado para dados legados ou transações cujo grupo sumiu. */
function buildSingleGroup(params: {
    id: string;
    rawTransaction: RawRecord;
    type: TransactionGroup["type"];
    title: string;
    notes: unknown;
    totalAmount: number;
    walletId: string;
    categoryId: string | null;
    createdAt: string;
    context: TransactionContext;
}): TransactionGroup {
    return normalizeTransactionGroup(
        {
            id: params.id,
            userId: params.context.userId,
            beneficiaryId: null,
            beneficiaryName: asString(params.rawTransaction.beneficiary, DEFAULT_BENEFICIARY_NAME),
            categoryId: params.categoryId,
            ...legacyCategoryNames(params.rawTransaction),
            title: params.title,
            notes: asNullableString(params.notes, null),
            type: params.type,
            transactionMode: "single",
            totalAmount: params.totalAmount,
            installmentCount: null,
            recurrenceRule: null,
            recurrenceEndDate: null,
            sourceWalletId: params.walletId,
            destinationWalletId: null,
            creditCardId: null,
            createdAt: params.createdAt,
        },
        params.context.walletIds,
    );
}

export function normalizeRawTransactionGroups(raw: unknown, creditCardIds: Set<string>, context: TransactionContext): SectionResult<TransactionGroup> {
    return normalizeRecordsById(raw, (rawGroup) => {
        const group = normalizeTransactionGroup(
            {
                id: rawGroup.id,
                userId: asNullableString(rawGroup.userId, context.userId),
                beneficiaryId: asNullableString(rawGroup.beneficiaryId, null),
                beneficiaryName: asString(rawGroup.beneficiaryName, DEFAULT_BENEFICIARY_NAME),
                categoryId: asNullableString(rawGroup.categoryId, null),
                categoryName: asString(rawGroup.categoryName, "Sem categoria"),
                subcategoryName: asNullableString(rawGroup.subcategoryName, null),
                title: asString(rawGroup.title, "Transacao"),
                notes: asNullableString(rawGroup.notes, null),
                type: resolveGroupType(rawGroup.type, asNumber(rawGroup.totalAmount, 0)),
                transactionMode: asTransactionMode(rawGroup.transactionMode),
                totalAmount: Math.abs(asNumber(rawGroup.totalAmount, 0)),
                installmentCount: asNumber(rawGroup.installmentCount, NaN),
                ...parseRemovedInstallments(rawGroup.removedInstallments),
                recurrenceRule: parseRecurrenceRule(rawGroup.recurrenceRule),
                recurrenceEndDate: asNullableString(rawGroup.recurrenceEndDate, null),
                sourceWalletId: asNullableString(rawGroup.sourceWalletId, null),
                destinationWalletId: asNullableString(rawGroup.destinationWalletId, null),
                creditCardId: asNullableString(rawGroup.creditCardId, null),
                createdAt: asDateTimeString(rawGroup.createdAt, context.now),
            },
            context.walletIds,
        );

        if (group.creditCardId && !creditCardIds.has(group.creditCardId)) {
            return { item: { ...group, creditCardId: null }, changed: true };
        }
        return { item: group };
    });
}

function normalizeCurrentTransaction(rawTransaction: RawRecord, index: number, groupsById: Map<string, TransactionGroup>, context: TransactionContext): { transaction: StoredTransaction; changed: boolean } {
    let changed = false;
    let transaction = normalizeStoredTransaction({
        id: asString(rawTransaction.id, `tx-${index}-${Date.now()}`),
        groupId: asString(rawTransaction.groupId, `group-${index}-${Date.now()}`),
        occurrenceNumber: asNumber(rawTransaction.occurrenceNumber, NaN),
        routingOverride: rawTransaction.routingOverride === true,
        commitment: rawTransaction.commitment === "forecast" ? "forecast" : "posted",
        title: asNullableString(rawTransaction.title, null),
        categoryId: asNullableString(rawTransaction.categoryId, null),
        beneficiaryId: asNullableString(rawTransaction.beneficiaryId, null),
        sourceWalletId: asNullableString(rawTransaction.sourceWalletId, null),
        destinationWalletId: asNullableString(rawTransaction.destinationWalletId, null),
        creditCardId: asNullableString(rawTransaction.creditCardId, null),
        paymentForInvoiceId: asNullableString(rawTransaction.paymentForInvoiceId, null),
        installmentNumber: asNumber(rawTransaction.installmentNumber, NaN),
        amount: asNumber(rawTransaction.amount, asNumber(rawTransaction.value, 0)),
        scheduledDate: asDateString(rawTransaction.scheduledDate ?? rawTransaction.date, context.today),
        status: normalizeTransactionStatus(rawTransaction.status),
        paidAt: asNullableString(rawTransaction.paidAt, null),
        invoiceId: asNullableString(rawTransaction.invoiceId, null),
        notes: asNullableString(rawTransaction.notes, null),
        createdAt: asDateTimeString(rawTransaction.createdAt, context.now),
    });

    if (!groupsById.has(transaction.groupId)) {
        changed = true;
        groupsById.set(
            transaction.groupId,
            buildSingleGroup({
                id: transaction.groupId,
                rawTransaction,
                type: resolveGroupType(rawTransaction.type, asNumber(rawTransaction.amount, 0)),
                title: asString(rawTransaction.description, "Transacao"),
                notes: rawTransaction.notes,
                totalAmount: Math.abs(asNumber(rawTransaction.amount, 0)),
                walletId: normalizeWalletId(asWalletId(rawTransaction.inWallet)),
                categoryId: asNullableString(rawTransaction.categoryId, null),
                createdAt: transaction.createdAt,
                context,
            }),
        );
    }

    // Só compras de cartão pertencem a uma fatura.
    if (!resolveTransactionCreditCardId(transaction, groupsById.get(transaction.groupId)) && transaction.invoiceId) {
        transaction = normalizeStoredTransaction({ ...transaction, invoiceId: null });
        changed = true;
    }

    return { transaction, changed };
}

/** Formato antigo: valor com sinal, carteira em `inWallet` e metadados em `meta`. */
function convertLegacyTransaction(rawTransaction: RawRecord, index: number, groupsById: Map<string, TransactionGroup>, context: TransactionContext): { transaction: StoredTransaction; ledgerEntries: LedgerEntry[] } {
    const signedValue = asNumber(rawTransaction.value, 0);
    const amount = Math.abs(signedValue);
    const meta = isRecord(rawTransaction.meta) ? rawTransaction.meta : null;
    const createdAt = meta ? asDateTimeString(meta.criado_em, context.now) : context.now;
    const transactionId = asString(rawTransaction.id, `legacy-tx-${index}-${Date.now()}`);
    const groupId = asString(rawTransaction.groupId, `legacy-group-${transactionId}`);

    const transaction = normalizeStoredTransaction({
        id: transactionId,
        groupId,
        installmentNumber: null,
        amount,
        scheduledDate: asDateString(rawTransaction.date, context.today),
        status: normalizeTransactionStatus(rawTransaction.status),
        paidAt: meta ? asNullableString(meta.atualizado_em, null) : null,
        invoiceId: null,
        notes: asNullableString(rawTransaction.description, null),
        createdAt,
    });

    if (!groupsById.has(groupId)) {
        groupsById.set(
            groupId,
            buildSingleGroup({
                id: groupId,
                rawTransaction,
                type: resolveGroupType(rawTransaction.type, signedValue),
                title: asString(rawTransaction.description, legacyCategoryNames(rawTransaction).categoryName),
                notes: rawTransaction.description,
                totalAmount: amount,
                walletId: normalizeWalletId(asWalletId(rawTransaction.inWallet)),
                categoryId: null,
                createdAt,
                context,
            }),
        );
    }

    const group = groupsById.get(groupId);
    const ledgerEntries = transaction.status === "paid" && group ? createLedgerEntriesForPaidTransaction(transaction, group) : [];
    return { transaction, ledgerEntries };
}

/**
 * Normaliza transações (formato atual e legado). Transações cujo grupo não existe ganham
 * um grupo avulso em `groupsById`; as legadas pagas trazem seus lançamentos de ledger.
 */
export function normalizeRawTransactions(
    raw: unknown,
    groupsById: Map<string, TransactionGroup>,
    context: TransactionContext,
): { transactions: StoredTransaction[]; legacyLedgerEntries: LedgerEntry[]; changed: boolean } {
    const { records, changed: listChanged } = collectRawRecords(raw);
    let changed = listChanged;
    const transactions: StoredTransaction[] = [];
    const legacyLedgerEntries: LedgerEntry[] = [];

    records.forEach(({ record, index }) => {
        if (typeof record.groupId === "string") {
            const result = normalizeCurrentTransaction(record, index, groupsById, context);
            changed ||= result.changed;
            transactions.push(result.transaction);
            return;
        }

        changed = true;
        const legacy = convertLegacyTransaction(record, index, groupsById, context);
        transactions.push(legacy.transaction);
        legacyLedgerEntries.push(...legacy.ledgerEntries);
    });

    return { transactions, legacyLedgerEntries, changed };
}
