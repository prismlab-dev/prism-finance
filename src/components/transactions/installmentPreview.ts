import { splitAmountAcrossInstallments } from "../../context/finance/helpers";
import { addMonthsToLocalDate } from "../../lib/localDate";

/** Acima disso a prévia resume o restante em uma linha. */
const MAX_PREVIEW_ROWS = 120;

/** Valores que substituem a divisão igual, por índice; `manual` é o que a pessoa digitou. */
export type InstallmentOverrides = Record<number, { amount: number; manual: boolean }>;

export const NO_INSTALLMENT_OVERRIDES: InstallmentOverrides = {};

export interface InstallmentPreviewRow {
    number: number;
    /** Mês em que a parcela pesa: vencimento da fatura no cartão, data da parcela na carteira. */
    date: string;
    amount: number;
    ignored: boolean;
    manual: boolean;
}

export interface InstallmentPreview {
    rows: InstallmentPreviewRow[];
    hiddenCount: number;
    count: number;
    ignoredCount: number;
    /** Parcelas agrupadas por valor; duas faixas quando sobram centavos. */
    amountGroups: Array<{ count: number; amount: number }>;
    lastDate: string;
    showDay: boolean;
    /** O que falta para a prévia ficar completa. */
    hint: string | null;
    customized: boolean;
    totalAmount: number;
    /** Soma das parcelas, que é o que será salvo. */
    installmentsTotal: number;
    /** Soma menos total: positivo passa, negativo falta. */
    difference: number;
    /** Números das parcelas sem valor; impedem salvar. */
    emptyNumbers: number[];
    /** Há parcelas não digitadas que conseguem absorver a diferença. */
    canSpread: boolean;
}

/** Prévia com as ações de edição dos valores. */
export interface InstallmentPlan {
    preview: InstallmentPreview;
    disabled: boolean;
    onAmountChange: (index: number, amount: number) => void;
    onSpread: () => void;
    onUseSumAsTotal: () => void;
    onReset: () => void;
}

interface BuildInstallmentPreviewParams {
    amount: number;
    countInput: string;
    ignoredCount?: number;
    startDate: string;
    showDay: boolean;
    overrides?: InstallmentOverrides;
}

function toCents(value: number): number {
    return Math.round(value * 100);
}

function parseCount(countInput: string): number {
    const count = Number(countInput);
    return Number.isInteger(count) && count >= 2 ? count : 0;
}

function resolveInstallmentAmounts(amount: number, count: number, overrides: InstallmentOverrides): number[] {
    return splitAmountAcrossInstallments(amount, count).map((value, index) => overrides[index]?.amount ?? value);
}

/** Valores para salvar; `null` mantém a divisão igual. */
export function customInstallmentAmounts(amount: number, count: number | null, overrides: InstallmentOverrides): number[] | null {
    if (!count || !Object.keys(overrides).some((index) => Number(index) < count)) return null;
    return resolveInstallmentAmounts(amount, count, overrides);
}

/** Divide o que falta do total entre as parcelas não digitadas; devolve `overrides` se não couber. */
export function spreadInstallmentDifference(amount: number, countInput: string, overrides: InstallmentOverrides): InstallmentOverrides {
    const indexes = Array.from({ length: parseCount(countInput) }, (_, index) => index);
    const openIndexes = indexes.filter((index) => !overrides[index]?.manual);
    const manualCents = indexes.reduce((sum, index) => sum + (overrides[index]?.manual ? toCents(overrides[index].amount) : 0), 0);
    const restCents = toCents(amount) - manualCents;
    if (openIndexes.length === 0 || restCents < openIndexes.length) return overrides;

    const base = Math.floor(restCents / openIndexes.length);
    const remainder = restCents - base * openIndexes.length;
    const next = { ...overrides };
    openIndexes.forEach((index, position) => {
        next[index] = { amount: (base + (position < remainder ? 1 : 0)) / 100, manual: false };
    });
    return next;
}

export function buildInstallmentPreview({ amount, countInput, ignoredCount = 0, startDate, showDay, overrides = NO_INSTALLMENT_OVERRIDES }: BuildInstallmentPreviewParams): InstallmentPreview {
    const count = parseCount(countInput);
    const empty: Omit<InstallmentPreview, "hint"> = {
        rows: [], hiddenCount: 0, count, ignoredCount: 0, amountGroups: [], lastDate: "", showDay,
        customized: false, totalAmount: amount, installmentsTotal: 0, difference: 0, emptyNumbers: [], canSpread: false,
    };
    if (!count) return { ...empty, hint: "Informe pelo menos 2 parcelas." };
    if (!startDate) return { ...empty, hint: "Escolha a fatura da primeira parcela." };

    const hasAmount = amount > 0;
    if (hasAmount && toCents(amount) < count) return { ...empty, hint: "Cada parcela precisa ter pelo menos R$ 0,01." };

    const amounts = hasAmount ? resolveInstallmentAmounts(amount, count, overrides) : splitAmountAcrossInstallments(0, count);
    const visibleCount = Math.min(count, MAX_PREVIEW_ROWS);
    const rows = amounts.slice(0, visibleCount).map((rowAmount, index) => ({
        number: index + 1,
        date: addMonthsToLocalDate(startDate, index),
        amount: rowAmount,
        ignored: index < ignoredCount,
        manual: hasAmount && Boolean(overrides[index]?.manual),
    }));
    const groups = new Map<number, number>();
    amounts.forEach((value) => groups.set(value, (groups.get(value) ?? 0) + 1));
    const sumCents = amounts.reduce((sum, value) => sum + toCents(value), 0);

    return {
        rows,
        hiddenCount: count - visibleCount,
        count,
        ignoredCount,
        amountGroups: hasAmount ? Array.from(groups, ([value, groupCount]) => ({ amount: value, count: groupCount })) : [],
        lastDate: addMonthsToLocalDate(startDate, count - 1),
        showDay,
        hint: hasAmount ? null : "Informe o valor total.",
        customized: hasAmount && customInstallmentAmounts(amount, count, overrides) !== null,
        totalAmount: amount,
        installmentsTotal: sumCents / 100,
        difference: hasAmount ? (sumCents - toCents(amount)) / 100 : 0,
        emptyNumbers: hasAmount ? amounts.flatMap((value, index) => (toCents(value) < 1 ? [index + 1] : [])) : [],
        canSpread: hasAmount && spreadInstallmentDifference(amount, countInput, overrides) !== overrides,
    };
}
