import { DEFAULT_WALLET_ID } from "../domainConstants";
import type { LedgerEntry, StoredTransaction, TransactionGroup } from "../domainTypes";
import { normalizeWalletId } from "../entityNormalization/walletNormalizers";
import { normalizeLedgerEntry } from "../entityNormalization/transactionNormalizers";
import { createLedgerEntriesForPaidTransaction } from "../ledger";
import { asDateTimeString, asNullableString, asNumber, asString } from "../valueNormalization";
import { collectRawRecords } from "./recordSections";

export function normalizeRawLedgerEntries(raw: unknown, walletIds: Set<string>, now: string): { ledgerEntries: LedgerEntry[]; changed: boolean } {
    const { records, changed: listChanged } = collectRawRecords(raw);
    let changed = listChanged;

    const ledgerEntries = records.map(({ record, index }) => {
        const walletId = normalizeWalletId(asString(record.walletId, DEFAULT_WALLET_ID));
        if (!walletIds.has(walletId)) {
            changed = true;
        }

        return normalizeLedgerEntry({
            id: asString(record.id, `le-${index}-${Date.now()}`),
            walletId,
            transactionId: asNullableString(record.transactionId, null),
            invoiceId: asNullableString(record.invoiceId, null),
            amount: asNumber(record.amount, 0),
            balanceAfter: asNumber(record.balanceAfter, 0),
            description: asString(record.description, "Lancamento"),
            createdAt: asDateTimeString(record.createdAt, now),
        });
    });

    return { ledgerEntries, changed };
}

function compareLedgerEntryRepairShape(a: LedgerEntry, b: LedgerEntry): number {
    if (a.walletId !== b.walletId) {
        return a.walletId.localeCompare(b.walletId);
    }
    if (a.amount !== b.amount) {
        return a.amount - b.amount;
    }
    if (a.createdAt !== b.createdAt) {
        return a.createdAt.localeCompare(b.createdAt);
    }
    if (a.description !== b.description) {
        return a.description.localeCompare(b.description, "pt-BR", { sensitivity: "base" });
    }
    if ((a.invoiceId ?? "") !== (b.invoiceId ?? "")) {
        return (a.invoiceId ?? "").localeCompare(b.invoiceId ?? "");
    }
    return (a.transactionId ?? "").localeCompare(b.transactionId ?? "");
}

/** Lançamentos existentes são mantidos (com seus ids) quando batem com a projeção esperada. */
function canReuseTransactionLedgerEntries(existingEntries: LedgerEntry[], expectedEntries: LedgerEntry[]): boolean {
    if (existingEntries.length !== expectedEntries.length) {
        return false;
    }

    const sortedExisting = [...existingEntries].sort(compareLedgerEntryRepairShape);
    const sortedExpected = [...expectedEntries].sort(compareLedgerEntryRepairShape);

    return sortedExisting.every((entry, index) => {
        const expected = sortedExpected[index];
        return (
            entry.walletId === expected.walletId &&
            entry.transactionId === expected.transactionId &&
            entry.invoiceId === expected.invoiceId &&
            entry.amount === expected.amount &&
            entry.description === expected.description &&
            entry.createdAt === expected.createdAt
        );
    });
}

/**
 * Alinha o ledger às transações: remove lançamentos de transações não pagas, recria os
 * ausentes ou divergentes e preserva lançamentos manuais ou de transações desconhecidas.
 */
export function reconcileTransactionLedger(params: {
    ledgerEntries: LedgerEntry[];
    transactions: StoredTransaction[];
    groupsById: Map<string, TransactionGroup>;
}): { ledgerEntries: LedgerEntry[]; changed: boolean } {
    let changed = false;
    const transactionById = new Map(params.transactions.map((transaction) => [transaction.id, transaction]));
    const existingByTransaction = new Map<string, LedgerEntry[]>();
    const reconciled: LedgerEntry[] = [];

    params.ledgerEntries.forEach((entry) => {
        const transaction = entry.transactionId ? transactionById.get(entry.transactionId) : undefined;
        if (!transaction) {
            reconciled.push(entry);
            return;
        }
        if (transaction.status !== "paid") {
            changed = true;
            return;
        }
        const existing = existingByTransaction.get(transaction.id);
        if (existing) {
            existing.push(entry);
        } else {
            existingByTransaction.set(transaction.id, [entry]);
        }
    });

    params.transactions.forEach((transaction) => {
        if (transaction.status !== "paid") {
            return;
        }

        const existingEntries = existingByTransaction.get(transaction.id) ?? [];
        const group = params.groupsById.get(transaction.groupId);
        if (!group) {
            reconciled.push(...existingEntries);
            return;
        }

        const expectedEntries = createLedgerEntriesForPaidTransaction(transaction, group);
        if (existingEntries.length > 0 && canReuseTransactionLedgerEntries(existingEntries, expectedEntries)) {
            reconciled.push(...existingEntries);
            return;
        }

        changed = true;
        reconciled.push(...expectedEntries);
    });

    return { ledgerEntries: reconciled, changed };
}
