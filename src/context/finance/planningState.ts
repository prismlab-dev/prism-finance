import type {
    PlanningRevenueOverride,
    PlanningSimulatedExpense,
    PlanningSimulatedIncome,
    PlanningState,
    PlanningWishlistSelection,
    ReportPeriod,
} from "./domainTypes";
import { DEFAULT_PLANNING_STATE, buildDefaultReportsPeriod } from "./defaultState";
import { formatYearMonth, getMonthKeyFromDateValue, parseYearMonthKey } from "./invoiceCycles";
import { normalizePlanningBudgets } from "./planningBudgets";
import { asArray, asBoolean, asDateTimeString, asNumber, asString, getNowIso } from "./valueNormalization";
import { getLocalTodayDate } from "../../lib/localDate";
import { isRecord, roundToCents } from "../../lib/primitives";

const LEGACY_REPORTS_RANGES = new Set([1, 3, 6, 9, 12]);

function isTimelineMonthCount(value: number): value is PlanningState["timelineMonthCount"] {
    return value === 3 || value === 6 || value === 9 || value === 12;
}

function normalizePlanningMonthKey(value: unknown, fallback = getMonthKeyFromDateValue(getLocalTodayDate())): string {
    if (typeof value !== "string") {
        return fallback;
    }

    const parsedMonth = parseYearMonthKey(value);
    if (!parsedMonth) {
        return fallback;
    }

    return formatYearMonth(parsedMonth.year, parsedMonth.monthIndex);
}

function normalizePlanningSimulatedExpense(input: Partial<PlanningSimulatedExpense>, index: number): PlanningSimulatedExpense {
    const amount = roundToCents(Math.max(0, Math.abs(asNumber(input.amount, 0))));
    const installmentCount = asNumber(input.installmentCount, 0);
    const isInstallment = Number.isInteger(installmentCount) && installmentCount >= 2 && Math.round(amount * 100) >= installmentCount;

    return {
        id: asString(input.id, `planning-expense-${index}-${Date.now()}`),
        monthKey: normalizePlanningMonthKey(input.monthKey),
        description: asString(input.description, "Gasto simulado"),
        amount,
        ...(isInstallment ? { installmentCount } : {}),
        createdAt: asDateTimeString(input.createdAt, getNowIso()),
    };
}

function normalizePlanningSimulatedIncome(input: Partial<PlanningSimulatedIncome>, index: number): PlanningSimulatedIncome {
    return {
        id: asString(input.id, `planning-income-${index}-${Date.now()}`),
        monthKey: normalizePlanningMonthKey(input.monthKey),
        description: asString(input.description, "Receita simulada"),
        amount: roundToCents(asNumber(input.amount, 0)),
        createdAt: asDateTimeString(input.createdAt, getNowIso()),
    };
}

function normalizePlanningRevenueOverride(input: Partial<PlanningRevenueOverride>): PlanningRevenueOverride {
    return {
        monthKey: normalizePlanningMonthKey(input.monthKey),
        amount: roundToCents(Math.max(0, asNumber(input.amount, 0))),
        updatedAt: asDateTimeString(input.updatedAt, getNowIso()),
    };
}

function normalizePlanningWishlistSelection(input: Partial<PlanningWishlistSelection>, index: number): PlanningWishlistSelection {
    return {
        id: asString(input.id, `planning-wishlist-${index}-${Date.now()}`),
        wishItemId: asString(input.wishItemId, "").trim(),
        monthKey: normalizePlanningMonthKey(input.monthKey),
        createdAt: asDateTimeString(input.createdAt, getNowIso()),
    };
}

function compareByMonthThenCreation(a: { monthKey: string; createdAt: string }, b: { monthKey: string; createdAt: string }): number {
    if (a.monthKey === b.monthKey) {
        return a.createdAt.localeCompare(b.createdAt);
    }
    return a.monthKey.localeCompare(b.monthKey);
}

function compareWishlistSelections(a: PlanningWishlistSelection, b: PlanningWishlistSelection): number {
    return compareByMonthThenCreation(a, b) || a.id.localeCompare(b.id);
}

/** Lista de ids sem duplicatas, ordenada; `keep` decide quais valores sobrevivem. */
function normalizeIdList(value: unknown, keep: (id: string) => boolean = (id) => id.trim().length > 0): string[] {
    const ids = asArray(value).filter((item): item is string => typeof item === "string" && keep(item));
    return Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b));
}

function collectRecords<T>(value: unknown, normalize: (record: Record<string, unknown>, index: number) => T | null): T[] {
    const items: T[] = [];
    asArray(value).forEach((raw, index) => {
        if (!isRecord(raw)) {
            return;
        }
        const item = normalize(raw, index);
        if (item !== null) {
            items.push(item);
        }
    });
    return items;
}

function keepLatestSelectionPerWishItem(selections: PlanningWishlistSelection[]): PlanningWishlistSelection[] {
    const byWishItemId = new Map<string, PlanningWishlistSelection>();
    selections.forEach((selection) => {
        const existing = byWishItemId.get(selection.wishItemId);
        const isNewer =
            !existing ||
            selection.createdAt > existing.createdAt ||
            (selection.createdAt === existing.createdAt &&
                (selection.monthKey > existing.monthKey || (selection.monthKey === existing.monthKey && selection.id > existing.id)));
        if (isNewer) {
            byWishItemId.set(selection.wishItemId, selection);
        }
    });
    return Array.from(byWishItemId.values());
}

function normalizeReportsPeriod(rawPlanning: Record<string, unknown>): ReportPeriod {
    const rawReportsRange = asNumber(rawPlanning.reportsRange, 9);
    const legacyReportsRange = LEGACY_REPORTS_RANGES.has(rawReportsRange) ? rawReportsRange : 9;
    const currentMonth = buildDefaultReportsPeriod().endMonth;

    // Antes do período explícito existia só `reportsRange` (N meses até o mês atual).
    const migratedStartDate = new Date();
    migratedStartDate.setDate(1);
    migratedStartDate.setMonth(migratedStartDate.getMonth() - legacyReportsRange + 1);
    const migratedStartMonth = formatYearMonth(migratedStartDate.getFullYear(), migratedStartDate.getMonth());

    const rawReportsPeriod = isRecord(rawPlanning.reportsPeriod) ? rawPlanning.reportsPeriod : null;
    const startMonth = normalizePlanningMonthKey(rawReportsPeriod?.startMonth, migratedStartMonth);
    const endMonth = normalizePlanningMonthKey(rawReportsPeriod?.endMonth, currentMonth);
    const clampedStart = startMonth > currentMonth ? currentMonth : startMonth;
    const clampedEnd = endMonth > currentMonth ? currentMonth : endMonth;

    return clampedStart <= clampedEnd ? { startMonth: clampedStart, endMonth: clampedEnd } : { startMonth: clampedEnd, endMonth: clampedStart };
}

export function normalizeInvoiceMonthOverrides(value: unknown): Record<string, string> {
    if (!isRecord(value) || Array.isArray(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value)
            .filter((entry): entry is [string, string] => entry[0].trim().length > 0 && typeof entry[1] === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(entry[1]))
            .sort(([a], [b]) => a.localeCompare(b)),
    );
}

export function normalizePlanningState(rawPlanning: unknown): PlanningState {
    if (!isRecord(rawPlanning)) {
        return DEFAULT_PLANNING_STATE;
    }

    const expensesById = new Map(
        collectRecords(rawPlanning.simulatedExpenses, (raw, index) => {
            const expense = normalizePlanningSimulatedExpense(raw, index);
            return expense.amount > 0 ? expense : null;
        }).map((expense) => [expense.id, expense]),
    );
    const incomesById = new Map(
        collectRecords(rawPlanning.simulatedIncomes, (raw, index) => {
            const income = normalizePlanningSimulatedIncome(raw, index);
            return Math.abs(income.amount) > 0.009 ? income : null;
        }).map((income) => [income.id, income]),
    );
    const overridesByMonth = new Map(
        collectRecords(rawPlanning.revenueOverrides, (raw) => normalizePlanningRevenueOverride(raw)).map((override) => [override.monthKey, override]),
    );
    const wishlistSelections = keepLatestSelectionPerWishItem(
        collectRecords(rawPlanning.wishlistSelections, (raw, index) => {
            const selection = normalizePlanningWishlistSelection(raw, index);
            return selection.wishItemId ? selection : null;
        }),
    );

    const rawTimelineMonthCount = asNumber(rawPlanning.timelineMonthCount, DEFAULT_PLANNING_STATE.timelineMonthCount);

    return {
        simulatedExpenses: Array.from(expensesById.values()).sort(compareByMonthThenCreation),
        simulatedIncomes: Array.from(incomesById.values()).sort(compareByMonthThenCreation),
        wishlistSelections: wishlistSelections.sort(compareWishlistSelections),
        revenueOverrides: Array.from(overridesByMonth.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey)),
        budgets: normalizePlanningBudgets(rawPlanning.budgets),
        disabledInheritedExpenseIds: normalizeIdList(rawPlanning.disabledInheritedExpenseIds),
        disabledIncomeIds: normalizeIdList(rawPlanning.disabledIncomeIds),
        disabledSimulatedExpenseIds: normalizeIdList(rawPlanning.disabledSimulatedExpenseIds, (id) => expensesById.has(id)),
        disabledSimulatedIncomeIds: normalizeIdList(rawPlanning.disabledSimulatedIncomeIds, (id) => incomesById.has(id)),
        invoiceMonthOverrides: normalizeInvoiceMonthOverrides(rawPlanning.invoiceMonthOverrides),
        timelineSelectedWalletIds: normalizeIdList(rawPlanning.timelineSelectedWalletIds),
        timelineCompareMode: asBoolean(rawPlanning.timelineCompareMode, DEFAULT_PLANNING_STATE.timelineCompareMode),
        timelineHorizontalMode: asBoolean(rawPlanning.timelineHorizontalMode, DEFAULT_PLANNING_STATE.timelineHorizontalMode),
        timelineMonthCount: isTimelineMonthCount(rawTimelineMonthCount) ? rawTimelineMonthCount : DEFAULT_PLANNING_STATE.timelineMonthCount,
        reportsSelectedWalletIds: normalizeIdList(rawPlanning.reportsSelectedWalletIds),
        reportsSelectedCreditCardIds: normalizeIdList(rawPlanning.reportsSelectedCreditCardIds),
        timelineSelectedCreditCardIds: normalizeIdList(rawPlanning.timelineSelectedCreditCardIds),
        reportsPeriod: normalizeReportsPeriod(rawPlanning),
    };
}
