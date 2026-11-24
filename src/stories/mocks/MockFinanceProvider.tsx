import type { ReactNode } from "react";
import { useMemo } from "react";
import {
    FinanceActionsContext,
    FinanceBeneficiariesContext,
    FinanceCategoriesContext,
    FinanceCreditCardInvoicesContext,
    FinanceCreditCardsContext,
    FinanceFamilyContext,
    FinanceFavoriteCreditCardContext,
    FinanceFavoriteWalletContext,
    FinanceLedgerEntriesContext,
    FinancePlanningContext,
    FinanceSessionContext,
    FinanceSharedWishlistsContext,
    FinanceStoredTransactionsContext,
    FinanceSummaryContext,
    FinanceSyncContext,
    FinanceTagsContext,
    FinanceTransactionGroupsContext,
    FinanceTransactionTagsContext,
    FinanceTransactionsContext,
    FinanceWalletsContext,
    FinanceWishItemsContext,
} from "../../context/finance/contexts";
import type { FinanceActionsValue, FinanceSessionValue, FinanceSyncValue } from "../../context/finance/contextTypes";
import {
    SAMPLE_FAMILY,
    SAMPLE_FAVORITE_WALLET_ID,
    SAMPLE_PROFILE,
    SAMPLE_SHARED_WISHLISTS,
    SAMPLE_SNAPSHOT,
    SAMPLE_TRANSACTIONS,
    SAMPLE_USER,
} from "./sampleFinance";

// Toda ação do app vira um no-op assíncrono que registra no painel Actions do Storybook (console).
const actionsProxy = new Proxy({} as FinanceActionsValue, {
    get: (_target, name) => async (...args: unknown[]) => {
        console.info(`[mock] ${String(name)}`, ...args);
        if (name === "generateFamilyInvite") {
            return { inviteId: "invite-demo", code: "ABCD-1234", createdBy: SAMPLE_USER.uid, status: "pending", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 864e5).toISOString() };
        }
        return undefined;
    },
});

const SYNC: FinanceSyncValue = {
    status: "synced",
    pendingCount: 0,
    lastSyncedAt: new Date().toISOString(),
    lastError: null,
    hasPendingSync: false,
    retrySync: () => undefined,
    restoreConfirmedData: async () => undefined,
    copySyncDiagnostic: async () => undefined,
};

/** Alimenta os 21 contextos financeiros com dados fictícios (sem Supabase). */
export function MockFinanceProvider({ children, sync = SYNC }: { children: ReactNode; sync?: FinanceSyncValue }) {
    const session = useMemo<FinanceSessionValue>(
        () => ({ user: SAMPLE_USER, profile: SAMPLE_PROFILE, loading: false, family: SAMPLE_FAMILY, profileVersion: 1 }),
        [],
    );
    const summary = useMemo(
        () => ({ despesas: SAMPLE_SNAPSHOT.despesas, receitas: SAMPLE_SNAPSHOT.receitas, balance: SAMPLE_SNAPSHOT.wallets.reduce((total, wallet) => total + wallet.balance, 0) }),
        [],
    );
    const s = SAMPLE_SNAPSHOT;

    return (
        <FinanceSessionContext.Provider value={session}>
            <FinanceFamilyContext.Provider value={SAMPLE_FAMILY}>
                <FinanceSharedWishlistsContext.Provider value={SAMPLE_SHARED_WISHLISTS}>
                    <FinanceFavoriteWalletContext.Provider value={SAMPLE_FAVORITE_WALLET_ID}>
                        <FinanceFavoriteCreditCardContext.Provider value={s.favoriteCreditCardId}>
                            <FinanceWalletsContext.Provider value={s.wallets}>
                                <FinanceCreditCardsContext.Provider value={s.creditCards}>
                                    <FinanceCreditCardInvoicesContext.Provider value={s.creditCardInvoices}>
                                        <FinanceBeneficiariesContext.Provider value={s.beneficiaries}>
                                            <FinanceCategoriesContext.Provider value={s.categories}>
                                                <FinanceTagsContext.Provider value={s.tags}>
                                                    <FinanceWishItemsContext.Provider value={s.wishItems}>
                                                        <FinanceTransactionGroupsContext.Provider value={s.transactionGroups}>
                                                            <FinanceStoredTransactionsContext.Provider value={s.transactions}>
                                                                <FinanceTransactionTagsContext.Provider value={s.transactionTags}>
                                                                    <FinanceLedgerEntriesContext.Provider value={s.ledgerEntries}>
                                                                        <FinanceTransactionsContext.Provider value={SAMPLE_TRANSACTIONS}>
                                                                            <FinancePlanningContext.Provider value={s.planning}>
                                                                                <FinanceSummaryContext.Provider value={summary}>
                                                                                    <FinanceActionsContext.Provider value={actionsProxy}>
                                                                                        <FinanceSyncContext.Provider value={sync}>{children}</FinanceSyncContext.Provider>
                                                                                    </FinanceActionsContext.Provider>
                                                                                </FinanceSummaryContext.Provider>
                                                                            </FinancePlanningContext.Provider>
                                                                        </FinanceTransactionsContext.Provider>
                                                                    </FinanceLedgerEntriesContext.Provider>
                                                                </FinanceTransactionTagsContext.Provider>
                                                            </FinanceStoredTransactionsContext.Provider>
                                                        </FinanceTransactionGroupsContext.Provider>
                                                    </FinanceWishItemsContext.Provider>
                                                </FinanceTagsContext.Provider>
                                            </FinanceCategoriesContext.Provider>
                                        </FinanceBeneficiariesContext.Provider>
                                    </FinanceCreditCardInvoicesContext.Provider>
                                </FinanceCreditCardsContext.Provider>
                            </FinanceWalletsContext.Provider>
                        </FinanceFavoriteCreditCardContext.Provider>
                    </FinanceFavoriteWalletContext.Provider>
                </FinanceSharedWishlistsContext.Provider>
            </FinanceFamilyContext.Provider>
        </FinanceSessionContext.Provider>
    );
}
