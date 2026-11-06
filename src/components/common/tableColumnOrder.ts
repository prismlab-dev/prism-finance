export function normalizeColumnOrder<Key extends string>(value: unknown, defaults: readonly Key[]): Key[] {
    const known = new Set<string>(defaults);
    const saved = Array.isArray(value) ? value.filter((item): item is Key => typeof item === "string" && known.has(item)) : [];
    const unique = [...new Set(saved)];
    return [...unique, ...defaults.filter((key) => !unique.includes(key))];
}

export const MIN_COLUMN_WIDTH_PERCENT = 5;
export const MAX_COLUMN_WIDTH_PERCENT = 50;

export function normalizeColumnWidths<Key extends string>(value: unknown, keys: readonly Key[]): Partial<Record<Key, number>> {
    if (typeof value !== "object" || value === null) return {};
    const source = value as Record<string, unknown>;
    const widths: Partial<Record<Key, number>> = {};
    for (const key of keys) {
        const width = source[key];
        if (typeof width === "number" && width >= MIN_COLUMN_WIDTH_PERCENT && width <= MAX_COLUMN_WIDTH_PERCENT) widths[key] = width;
    }
    return widths;
}
