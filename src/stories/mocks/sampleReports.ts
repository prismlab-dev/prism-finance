import {
    buildBalanceTimeline,
    buildCardRows,
    buildCardSummary,
    buildInvoiceMonths,
    buildUpcomingInstallments,
    buildWalletRows,
    getTopPurchases,
} from "../../components/pages/planning/planningAccountReports";
import { buildPlanningSummary } from "../../components/pages/planning/planningPageShared";
import { buildReportsDataset, type ReportPeriod, type ReportScope } from "../../components/pages/planning/planningReportsUtils";
import { getLocalTodayDate } from "../../lib/localDate";
import { SAMPLE_BUDGET_TRANSACTIONS } from "./sampleBudgets";
import { SAMPLE_SNAPSHOT } from "./sampleFinance";

// Dados dos relatórios montados pelos mesmos construtores que a tela de Relatórios usa.
const s = SAMPLE_SNAPSHOT;
const now = new Date();
const monthKey = (offset: number) => {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const SAMPLE_TODAY_DATE = getLocalTodayDate();
export const SAMPLE_REPORT_PERIOD: ReportPeriod = { startMonth: monthKey(-3), endMonth: monthKey(0) };
export const SAMPLE_REPORT_SCOPE: ReportScope = { walletIds: s.wallets.map((wallet) => wallet.id), creditCardIds: s.creditCards.map((card) => card.id) };
export const SAMPLE_WALLET_SCOPE: ReportScope = { walletIds: s.wallets.map((wallet) => wallet.id), creditCardIds: [] };
export const SAMPLE_CARD_SCOPE: ReportScope = { walletIds: [], creditCardIds: s.creditCards.map((card) => card.id) };

const dataset = (scope: ReportScope) => buildReportsDataset(SAMPLE_REPORT_PERIOD, SAMPLE_BUDGET_TRANSACTIONS, s.creditCardInvoices, scope, s.beneficiaries, s.tags);

export const SAMPLE_REPORTS_DATASET = dataset(SAMPLE_REPORT_SCOPE);
export const SAMPLE_WALLET_DATASET = dataset(SAMPLE_WALLET_SCOPE);
export const SAMPLE_CARD_DATASET = dataset(SAMPLE_CARD_SCOPE);

export const SAMPLE_WALLET_ROWS = buildWalletRows(SAMPLE_REPORT_PERIOD, SAMPLE_BUDGET_TRANSACTIONS, s.creditCardInvoices, s.wallets, s.beneficiaries);
export const SAMPLE_CARD_ROWS = buildCardRows(SAMPLE_REPORT_PERIOD, SAMPLE_BUDGET_TRANSACTIONS, s.creditCardInvoices, s.creditCards, s.beneficiaries);
export const SAMPLE_BALANCE_POINTS = buildBalanceTimeline(SAMPLE_WALLET_DATASET.monthReports, s.wallets, s.ledgerEntries);
export const SAMPLE_INVOICE_MONTHS = buildInvoiceMonths(SAMPLE_CARD_DATASET.monthReports, s.creditCardInvoices, s.creditCards.map((card) => card.id), SAMPLE_TODAY_DATE);
export const SAMPLE_CARD_SUMMARY = buildCardSummary(s.creditCardInvoices, s.creditCards);
export const SAMPLE_UPCOMING_INSTALLMENTS = buildUpcomingInstallments(SAMPLE_BUDGET_TRANSACTIONS, s.creditCardInvoices, s.creditCards.map((card) => card.id), SAMPLE_TODAY_DATE);
export const SAMPLE_TOP_PURCHASES = getTopPurchases(SAMPLE_BUDGET_TRANSACTIONS, s.creditCardInvoices, s.creditCards.map((card) => card.id), SAMPLE_CARD_DATASET.monthReports);

export const SAMPLE_PLANNING_SUMMARY = buildPlanningSummary({
    selectedMonth: monthKey(0),
    wallets: s.wallets,
    creditCards: s.creditCards,
    creditCardInvoices: s.creditCardInvoices,
    transactions: SAMPLE_BUDGET_TRANSACTIONS,
    ledgerEntries: s.ledgerEntries,
    simulationInput: { amount: 1200, paymentMethod: "credit_card", purchaseDate: SAMPLE_TODAY_DATE, installments: 3, walletId: null, creditCardId: s.creditCards[0].id },
});
