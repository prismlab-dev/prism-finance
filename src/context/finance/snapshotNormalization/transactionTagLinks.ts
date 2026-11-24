import type { TransactionTag } from "../domainTypes";
import { asNullableString } from "../valueNormalization";
import { collectRawRecords } from "./recordSections";

/** Mantém só vínculos únicos entre transações e tags que existem. */
export function normalizeTransactionTagLinks(raw: unknown, transactionIds: Set<string>, tagIds: Set<string>): { links: TransactionTag[]; changed: boolean } {
    const { records, changed: listChanged } = collectRawRecords(raw);
    let changed = listChanged;
    const links: TransactionTag[] = [];
    const keys = new Set<string>();

    records.forEach(({ record }) => {
        const transactionId = asNullableString(record.transactionId, null);
        const tagId = asNullableString(record.tagId, null);
        const key = `${transactionId}::${tagId}`;
        if (!transactionId || !tagId || !transactionIds.has(transactionId) || !tagIds.has(tagId) || keys.has(key)) {
            changed = true;
            return;
        }

        keys.add(key);
        links.push({ transactionId, tagId });
    });

    return { links, changed };
}
