import { monthPeriod } from "../../context/finance/recurrence/period";
import { projectOccurrences } from "../../context/finance/recurrence/projectOccurrences";
import { toTransactionList } from "../../context/finance/financeCore";
import { buildBudgetRuleOptions, createBudgetRuleResolver, getBudgetDisplayName } from "../../components/pages/budgets/budgetRuleOptions";
import { BUDGET_HISTORY_MONTHS, buildBudgetsOverview, previewBudgetRules, suggestBudgetAmount } from "../../components/pages/budgets/budgetUtils";
import type { BudgetRuleSet } from "../../components/pages/budgets/budgetRules";
import { formatMonthLabel, getCurrentMonthKey } from "../../components/pages/statement/statementPageShared";
import { getLocalTodayDate } from "../../lib/localDate";
import { SAMPLE_SNAPSHOT, SAMPLE_TRANSACTIONS } from "./sampleFinance";

// Mesma montagem que BudgetsPage faz com os hooks, só que sobre os dados fictícios.
const s = SAMPLE_SNAPSHOT;

export const SAMPLE_MONTH_KEY = getCurrentMonthKey();
export const SAMPLE_MONTH_LABEL = formatMonthLabel(SAMPLE_MONTH_KEY);
export const SAMPLE_TODAY = getLocalTodayDate();

const { startDate, endDate } = monthPeriod(SAMPLE_MONTH_KEY, BUDGET_HISTORY_MONTHS - 1);
const projected = projectOccurrences({
    groups: s.transactionGroups, transactions: s.transactions, transactionTags: s.transactionTags,
    creditCards: s.creditCards, creditCardInvoices: s.creditCardInvoices, period: { startDate, endDate },
});

/** Lançamentos guardados + ocorrências projetadas da série recorrente, como `useFinanceTransactions(period)`. */
export const SAMPLE_BUDGET_TRANSACTIONS = SAMPLE_TRANSACTIONS.concat(
    toTransactionList(projected.transactions.filter((transaction) => transaction.isProjected), s.transactionGroups, s.categories, s.beneficiaries, s.tags, projected.transactionTags),
);

export const SAMPLE_RULE_OPTIONS = buildBudgetRuleOptions({
    categories: s.categories, groups: s.transactionGroups, tags: s.tags, beneficiaries: s.beneficiaries, wallets: s.wallets, creditCards: s.creditCards,
});
export const SAMPLE_RULE_RESOLVER = createBudgetRuleResolver(SAMPLE_RULE_OPTIONS);
export const SAMPLE_BUDGET_NAME_BY_ID = new Map(s.planning.budgets.map((budget) => [budget.id, getBudgetDisplayName(budget, SAMPLE_RULE_RESOLVER.labelOf)]));

const input = { categories: s.categories, transactions: SAMPLE_BUDGET_TRANSACTIONS, creditCardInvoices: s.creditCardInvoices, monthKey: SAMPLE_MONTH_KEY };

export const SAMPLE_BUDGETS_OVERVIEW = buildBudgetsOverview({ budgets: s.planning.budgets, ...input, today: SAMPLE_TODAY });
export const previewSampleRules = (rules: BudgetRuleSet) => previewBudgetRules(rules, [], { ...input, today: SAMPLE_TODAY });
export const suggestSampleAmount = (rules: BudgetRuleSet) => suggestBudgetAmount(rules, input);
