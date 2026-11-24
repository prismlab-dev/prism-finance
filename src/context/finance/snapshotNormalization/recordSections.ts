import { asArray } from "../valueNormalization";
import { isRecord } from "../../../lib/primitives";

export type RawRecord = Record<string, unknown>;
export type RawRecordWithId = RawRecord & { id: string };

/** Resultado de uma etapa: `changed` indica que o dado bruto precisou de reparo e deve ser regravado. */
export interface SectionResult<T> {
    byId: Map<string, T>;
    changed: boolean;
}

export interface RecordNormalization<T> {
    /** `null` descarta o registro. */
    item: T | null;
    changed?: boolean;
}

/**
 * Normaliza uma lista bruta de registros com `id`, descartando itens inválidos e
 * duplicados (o primeiro vence). Qualquer descarte ou reparo marca a etapa como alterada.
 */
export function normalizeRecordsById<T extends { id: string }>(
    raw: unknown,
    normalize: (record: RawRecordWithId, index: number) => RecordNormalization<T>,
): SectionResult<T> {
    let changed = !Array.isArray(raw);
    const byId = new Map<string, T>();

    asArray(raw).forEach((value, index) => {
        if (!isRecord(value) || typeof value.id !== "string") {
            changed = true;
            return;
        }

        const result = normalize(value as RawRecordWithId, index);
        if (result.changed) {
            changed = true;
        }
        if (!result.item || byId.has(result.item.id)) {
            changed = true;
            return;
        }

        byId.set(result.item.id, result.item);
    });

    return { byId, changed };
}

/** Lista bruta sem chave: só descarta o que não é objeto. */
export function collectRawRecords(raw: unknown): { records: { record: RawRecord; index: number }[]; changed: boolean } {
    let changed = !Array.isArray(raw);
    const records: { record: RawRecord; index: number }[] = [];
    asArray(raw).forEach((value, index) => {
        if (!isRecord(value)) {
            changed = true;
            return;
        }
        records.push({ record: value, index });
    });
    return { records, changed };
}
