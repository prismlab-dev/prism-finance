import { DEFAULT_WALLET_ID } from "./domainConstants";
import type { PlanningState, ReportPeriod, Wallet } from "./domainTypes";
import { formatYearMonth } from "./invoiceCycles";
import { DEFAULT_WALLET_COLOR, DEFAULT_WALLET_ICON } from "../../lib/walletVisual";

export const DEFAULT_WALLET: Wallet = {
    id: DEFAULT_WALLET_ID,
    name: "Carteira Principal",
    icon: DEFAULT_WALLET_ICON,
    type: "checking",
    balance: 0,
    initialBalance: 0,
    currency: "BRL",
    color: DEFAULT_WALLET_COLOR,
    isActive: true,
    includeInMainTotals: true,
    createdAt: new Date().toISOString(),
};

/** Período padrão dos relatórios: os últimos 9 meses, terminando no mês de referência. */
export function buildDefaultReportsPeriod(referenceDate = new Date()): ReportPeriod {
    const endMonth = formatYearMonth(referenceDate.getFullYear(), referenceDate.getMonth());
    const startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 8, 1);

    return {
        startMonth: formatYearMonth(startDate.getFullYear(), startDate.getMonth()),
        endMonth,
    };
}

export const DEFAULT_PLANNING_STATE: PlanningState = {
    simulatedExpenses: [],
    simulatedIncomes: [],
    wishlistSelections: [],
    revenueOverrides: [],
    budgets: [],
    disabledInheritedExpenseIds: [],
    disabledIncomeIds: [],
    disabledSimulatedExpenseIds: [],
    disabledSimulatedIncomeIds: [],
    invoiceMonthOverrides: {},
    timelineSelectedWalletIds: [],
    timelineSelectedCreditCardIds: [],
    timelineCompareMode: true,
    timelineHorizontalMode: false,
    timelineMonthCount: 9,
    reportsSelectedWalletIds: [],
    reportsSelectedCreditCardIds: [],
    reportsPeriod: buildDefaultReportsPeriod(),
};
