const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

const monthLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
});

export interface ParsedMonthKey {
    year: number;
    /** Índice 0-11, compatível com `new Date(year, monthIndex, 1)`. */
    monthIndex: number;
}

export function padMonthPart(value: number): string {
    return String(value).padStart(2, "0");
}

/** Converte uma data em chave `YYYY-MM` usando o fuso local. */
export function getCurrentMonthKey(referenceDate = new Date()): string {
    return `${referenceDate.getFullYear()}-${padMonthPart(referenceDate.getMonth() + 1)}`;
}

export function parseMonthKey(monthKey: string): ParsedMonthKey | null {
    const match = MONTH_KEY_PATTERN.exec(monthKey.trim());
    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) {
        return null;
    }

    return { year, monthIndex: month - 1 };
}

/** Primeiro dia do mês da chave, ou `null` se a chave for inválida. */
export function monthKeyToDate(monthKey: string): Date | null {
    const parsed = parseMonthKey(monthKey);
    return parsed ? new Date(parsed.year, parsed.monthIndex, 1) : null;
}

/** Desloca a chave em `offset` meses; chave inválida cai para o mês atual. */
export function shiftMonth(monthKey: string, offset: number): string {
    const parsed = parseMonthKey(monthKey);
    if (!parsed) {
        return getCurrentMonthKey();
    }

    return getCurrentMonthKey(new Date(parsed.year, parsed.monthIndex + offset, 1));
}

/** Rótulo longo em pt-BR ("Março de 2026"); devolve a própria chave se for inválida. */
export function formatMonthLabel(monthKey: string): string {
    const date = monthKeyToDate(monthKey);
    if (!date) {
        return monthKey;
    }

    const formatted = monthLabelFormatter.format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
