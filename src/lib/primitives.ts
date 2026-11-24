export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toRevision(value: unknown): number {
    const revision = Number(value);
    return Number.isFinite(revision) && revision >= 0 ? revision : 0;
}

export function roundToCents(value: number): number {
    return Math.round(value * 100) / 100;
}

export function capitalizeLabel(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
