import type {
    Beneficiary,
    Category,
    CreditCard,
    CreditCardInvoice,
    FinanceSnapshot,
    LedgerEntry,
    PlanningState,
    StoredTransaction,
    Tag,
    TransactionGroup,
    TransactionTag,
    Wallet,
    WishItem,
} from "./domainTypes";
import { DEFAULT_PLANNING_STATE } from "./defaultState";
import { calculateFinanceSummary } from "./financeSummary";
import { applyLedgerToWallets } from "./ledger";
import { normalizePlanningState } from "./planningState";

/** Monta o snapshot a partir de entidades já normalizadas, recalculando saldos e o resumo. */
export function createFinanceSnapshot(
    wallets: Wallet[],
    creditCards: CreditCard[],
    creditCardInvoices: CreditCardInvoice[],
    favoriteCreditCardId: string | null,
    transactionGroups: TransactionGroup[],
    transactions: StoredTransaction[],
    ledgerEntries: LedgerEntry[],
    beneficiaries: Beneficiary[] = [],
    categories: Category[] = [],
    tags: Tag[] = [],
    wishItems: WishItem[] = [],
    transactionTags: TransactionTag[] = [],
    planning: PlanningState = DEFAULT_PLANNING_STATE,
): FinanceSnapshot {
    const withLedgerApplied = applyLedgerToWallets(wallets, ledgerEntries);
    const summary = calculateFinanceSummary(wallets, transactionGroups, transactions);

    return {
        despesas: summary.despesas,
        receitas: summary.receitas,
        wallets: withLedgerApplied.wallets,
        creditCards,
        creditCardInvoices,
        favoriteCreditCardId,
        transactionGroups,
        transactions,
        ledgerEntries: withLedgerApplied.ledgerEntries,
        beneficiaries,
        categories,
        tags,
        wishItems,
        transactionTags,
        planning: normalizePlanningState(planning),
    };
}
