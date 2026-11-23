import type { TransactionGroup } from "./domainTypes";

/** Installment erased together with its card, kept so the remaining series still describes the whole purchase. */
export interface RemovedInstallment {
    number: number | null;
    amount: number;
    date: string;
    cardName: string;
}

/** Fixed key order: jsonb reorders keys and the sync delta compares serialized values. */
export function parseRemovedInstallments(value: unknown): Pick<TransactionGroup, "removedInstallments"> {
    if (!Array.isArray(value)) return {};
    const removedInstallments = value.flatMap((item): RemovedInstallment[] => {
        const amount = Number(item?.amount);
        if (!Number.isFinite(amount) || typeof item?.date !== "string") return [];
        return [{
            number: Number.isInteger(item.number) ? item.number : null,
            amount,
            date: item.date,
            cardName: typeof item.cardName === "string" ? item.cardName : "",
        }];
    });
    return removedInstallments.length > 0 ? { removedInstallments } : {};
}

export function removedInstallmentsTotal(group: Pick<TransactionGroup, "removedInstallments"> | undefined): number {
    return (group?.removedInstallments ?? []).reduce((cents, item) => cents + Math.round(item.amount * 100), 0) / 100;
}
