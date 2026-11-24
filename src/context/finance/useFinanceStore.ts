import { useMemo } from "react";
import { useAuthListener } from "../../hooks/useAuthListener";
import type { FinanceStoreValue } from "./contextTypes";
import { calculateFinanceSummary } from "./financeSummary";
import { calculateTotalBalance } from "./ledger";
import type { FinanceStoreKernel } from "./store/storeKernel";
import { useBeneficiaryActions } from "./store/useBeneficiaryActions";
import { useCategoryActions } from "./store/useCategoryActions";
import { useCreditCardActions } from "./store/useCreditCardActions";
import { useFamilyState } from "./store/useFamilyState";
import { useFinanceLoading } from "./store/useFinanceLoading";
import { useFinanceStoreState } from "./store/useFinanceStoreState";
import { useFinanceSync } from "./store/useFinanceSync";
import { usePlanningActions } from "./store/usePlanningActions";
import { useTagAndWishlistActions } from "./store/useTagAndWishlistActions";
import { useTransactionActions } from "./store/useTransactionActions";
import { useWalletActions } from "./store/useWalletActions";
import { toTransactionList } from "./transactionList";

/**
 * Orquestra o store financeiro: estado local (cache), sincronização com o servidor,
 * carregamento e as ações por domínio. As regras vivem nos módulos de `store/` e do domínio.
 */
export function useFinanceStore(): FinanceStoreValue {
    const { user, loading: authLoading, profileVersion } = useAuthListener();
    const state = useFinanceStoreState();
    const familyState = useFamilyState(user);
    const sync = useFinanceSync(user, state);
    const financeLoading = useFinanceLoading({ user, profileVersion, state, sync, setFamilyState: familyState.setFamilyState });

    // As ações dependem só dos membros estáveis do kernel (refs e callbacks), não da identidade do objeto.
    const kernel: FinanceStoreKernel = { user, state, persistFinanceFields: sync.persistFinanceFields, persistFullSnapshot: sync.persistFullSnapshot };

    const walletActions = useWalletActions(kernel);
    const creditCardActions = useCreditCardActions(kernel);
    const beneficiaryActions = useBeneficiaryActions(kernel);
    const categoryActions = useCategoryActions(kernel);
    const tagAndWishlistActions = useTagAndWishlistActions(kernel);
    const transactionActions = useTransactionActions(kernel);
    const planningActions = usePlanningActions(kernel);

    const { snapshot, favoriteWalletId, profile } = state;
    const { wallets, transactionGroups, transactions: storedTransactions, categories, beneficiaries, tags, transactionTags } = snapshot;
    const transactions = useMemo(
        () => toTransactionList(storedTransactions, transactionGroups, categories, beneficiaries, tags, transactionTags),
        [beneficiaries, categories, storedTransactions, tags, transactionGroups, transactionTags],
    );
    const summary = useMemo(() => calculateFinanceSummary(wallets, transactionGroups, storedTransactions), [storedTransactions, transactionGroups, wallets]);
    const balance = useMemo(() => calculateTotalBalance(wallets), [wallets]);
    const loading = authLoading || financeLoading;

    return useMemo(
        () => ({
            user,
            profile,
            loading,
            profileVersion,
            family: familyState.family,
            sharedWishlists: familyState.sharedWishlists,
            favoriteWalletId,
            favoriteCreditCardId: snapshot.favoriteCreditCardId,
            wallets,
            creditCards: snapshot.creditCards,
            creditCardInvoices: snapshot.creditCardInvoices,
            beneficiaries,
            categories,
            tags,
            wishItems: snapshot.wishItems,
            transactionGroups,
            storedTransactions,
            transactionTags,
            ledgerEntries: snapshot.ledgerEntries,
            transactions,
            planning: snapshot.planning,
            despesas: summary.despesas,
            receitas: summary.receitas,
            balance,
            sync: sync.financeSync,
            updateFinance: sync.updateFinance,
            ...walletActions,
            ...creditCardActions,
            ...beneficiaryActions,
            ...categoryActions,
            ...tagAndWishlistActions,
            ...transactionActions,
            ...planningActions,
            ...familyState.actions,
        }),
        [
            balance,
            beneficiaries,
            beneficiaryActions,
            categories,
            categoryActions,
            creditCardActions,
            familyState.actions,
            familyState.family,
            familyState.sharedWishlists,
            favoriteWalletId,
            loading,
            planningActions,
            profile,
            profileVersion,
            snapshot.creditCardInvoices,
            snapshot.creditCards,
            snapshot.favoriteCreditCardId,
            snapshot.ledgerEntries,
            snapshot.planning,
            snapshot.wishItems,
            storedTransactions,
            summary.despesas,
            summary.receitas,
            sync.financeSync,
            sync.updateFinance,
            tagAndWishlistActions,
            tags,
            transactionActions,
            transactionGroups,
            transactionTags,
            transactions,
            user,
            walletActions,
        ],
    );
}
