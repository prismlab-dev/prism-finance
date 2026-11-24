export function extractCurrencyDigits(value: string): string {
    return value.replace(/\D/g, "");
}

export function formatCurrencyFromDigits(digits: string): string {
    const normalizedDigits = digits.replace(/^0+(?=\d)/, "") || "0";
    const centsValue = Number(normalizedDigits);

    if (!Number.isFinite(centsValue)) {
        return "R$ 0,00";
    }

    const currencyValue = centsValue / 100;
    const formatted = currencyValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return `R$ ${formatted}`;
}

/** Valor numérico (reais) → texto mascarado de campo, ex.: `12.5` → `R$ 12,50`. Sinal é descartado. */
export function formatAmountInputFromValue(value: number): string {
    const cents = Math.max(0, Math.round(Math.abs(value) * 100));
    return formatCurrencyFromDigits(String(cents));
}

/** Texto mascarado de campo → valor numérico (reais). */
export function parseAmountInput(value: string): number {
    return parseCurrencyDigitsToNumber(extractCurrencyDigits(value));
}

export function parseCurrencyDigitsToNumber(digits: string): number {
    const normalizedDigits = digits.replace(/^0+(?=\d)/, "") || "0";
    const centsValue = Number(normalizedDigits);
    if (!Number.isFinite(centsValue)) {
        return 0;
    }

    return centsValue / 100;
}
