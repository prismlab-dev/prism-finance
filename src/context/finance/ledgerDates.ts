import type { StoredTransaction } from "./domainTypes";
import { parseAppDate } from "../../lib/localDate";

// Ledger timestamps represent when the wallet balance should move, not when the record was created.
export function resolveLedgerEntryDateIso(dateValue: string, fallbackIso: string): string {
    const parsedDate = parseAppDate(dateValue);
    if (!parsedDate) {
        return fallbackIso;
    }

    const localMidday = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 12, 0, 0, 0);
    return localMidday.toISOString();
}

export function getTransactionLedgerEntryDateIso(transaction: Pick<StoredTransaction, "scheduledDate" | "paidAt" | "createdAt">): string {
    return transaction.paidAt ?? resolveLedgerEntryDateIso(transaction.scheduledDate, transaction.createdAt);
}
