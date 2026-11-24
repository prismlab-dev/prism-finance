import { formatLocalDateInput, parseAppDate } from "../../lib/localDate";

export function asString(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function asNullableString(value: unknown, fallback: string | null): string | null {
    if (typeof value !== "string") {
        return fallback;
    }
    const normalized = value.trim();
    return normalized ? normalized : fallback;
}

export function asNumber(value: unknown, fallback: number): number {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

export function asDayOfMonth(value: unknown, fallback: number): number {
    const numeric = Math.round(asNumber(value, fallback));
    if (!Number.isFinite(numeric)) {
        return Math.min(31, Math.max(1, fallback));
    }
    return Math.min(31, Math.max(1, numeric));
}

export function asSortOrder(value: unknown, fallback: number): number {
    const safeFallback = Number.isFinite(fallback) ? fallback : 0;
    const numeric = Math.round(asNumber(value, safeFallback));
    return Number.isFinite(numeric) ? Math.max(0, numeric) : Math.max(0, Math.round(safeFallback));
}

export function asBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === "boolean" ? value : fallback;
}

export function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

/** Normaliza para `AAAA-MM-DD` local; entradas inválidas usam o fallback. */
export function asDateString(value: unknown, fallback: string): string {
    if (typeof value !== "string") {
        return fallback;
    }

    const parsed = parseAppDate(value);
    if (!parsed) {
        return fallback;
    }
    return formatLocalDateInput(parsed);
}

/** Normaliza para ISO-8601 em UTC; entradas inválidas usam o fallback. */
export function asDateTimeString(value: unknown, fallback: string): string {
    const parsed = typeof value === "string" ? new Date(value) : new Date(NaN);
    if (Number.isNaN(parsed.getTime())) {
        return fallback;
    }
    return parsed.toISOString();
}

export function getNowIso(): string {
    return new Date().toISOString();
}
