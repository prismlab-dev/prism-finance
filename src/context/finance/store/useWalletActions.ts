import { useCallback, useEffect, useMemo } from "react";
import type { Wallet } from "../domainTypes";
import type { FinanceActionsValue } from "../contextTypes";
import { normalizeWallet, normalizeWalletId } from "../entityNormalization/walletNormalizers";
import { roundToCents } from "../helpers";
import { permanentlyDeleteWalletData } from "../permanentDeletion";
import { recalculateGroupTotals } from "../transactionSeries/helpers";
import { resolveFavoriteCreditCardId, resolveFavoriteWalletId } from "./favoriteSelection";
import { withSyncedInvoices } from "./snapshotInvoices";
import { setActiveById, upsertById } from "./registryCommands";
import type { FinanceStoreKernel } from "./storeKernel";

type WalletActions = Pick<FinanceActionsValue, "setStartBalance" | "setFavoriteWallet" | "setWalletActive" | "deleteWallet" | "permanentlyDeleteWallet" | "addWallet">;

export function useWalletActions({ state, persistFinanceFields, persistFullSnapshot }: FinanceStoreKernel): WalletActions {
    const { snapshotRef, favoriteWalletIdRef, buildSnapshot, commitSnapshot, setFavoriteWalletId } = state;

    /** Confirma carteiras novas localmente e persiste carteiras + ledger (saldo depende dos dois). */
    const commitWallets = useCallback(
        (wallets: Wallet[], favoriteWalletId?: string) => {
            const snapshot = buildSnapshot({ wallets });
            commitSnapshot(snapshot);
            if (favoriteWalletId) {
                setFavoriteWalletId(favoriteWalletId);
            }
            persistFinanceFields({ wallets: snapshot.wallets, ledgerEntries: snapshot.ledgerEntries, ...(favoriteWalletId ? { favoriteWalletId } : {}) });
        },
        [buildSnapshot, commitSnapshot, persistFinanceFields, setFavoriteWalletId],
    );

    const setStartBalance = useCallback(
        async (walletId: string, newStartBalance: number) => {
            const normalizedWalletId = normalizeWalletId(walletId);
            const initialBalance = roundToCents(Number(newStartBalance));
            if (!Number.isFinite(initialBalance)) {
                return;
            }

            commitWallets(snapshotRef.current.wallets.map((wallet) => (wallet.id === normalizedWalletId ? { ...wallet, initialBalance } : wallet)));
        },
        [commitWallets, snapshotRef],
    );

    const setFavoriteWallet = useCallback(
        async (walletId: string) => {
            const nextFavoriteWalletId = resolveFavoriteWalletId(walletId, snapshotRef.current.wallets);
            if (favoriteWalletIdRef.current === nextFavoriteWalletId) {
                return;
            }

            setFavoriteWalletId(nextFavoriteWalletId);
            persistFinanceFields({ favoriteWalletId: nextFavoriteWalletId });
        },
        [favoriteWalletIdRef, persistFinanceFields, setFavoriteWalletId, snapshotRef],
    );

    const setWalletActive = useCallback(
        async (walletId: string, isActive: boolean) => {
            const normalizedWalletId = normalizeWalletId(walletId);
            if (normalizedWalletId === favoriteWalletIdRef.current && !isActive) {
                return;
            }

            const result = setActiveById(snapshotRef.current.wallets, normalizedWalletId, isActive);
            if (!result.changed) {
                return;
            }

            commitWallets(result.items, resolveFavoriteWalletId(favoriteWalletIdRef.current, result.items));
        },
        [commitWallets, favoriteWalletIdRef, snapshotRef],
    );

    const deleteWallet = useCallback(
        async (walletId: string) => {
            const normalizedWalletId = normalizeWalletId(walletId);
            const target = snapshotRef.current.wallets.find((wallet) => wallet.id === normalizedWalletId);
            if (normalizedWalletId === favoriteWalletIdRef.current || !target?.isActive) {
                return;
            }

            await setWalletActive(normalizedWalletId, false);
        },
        [favoriteWalletIdRef, setWalletActive, snapshotRef],
    );

    /** Só carteiras já desativadas (e que não são a favorita) podem ser apagadas de vez. */
    const permanentlyDeleteWallet = useCallback(
        async (walletId: string) => {
            const normalizedWalletId = normalizeWalletId(walletId);
            const current = snapshotRef.current;
            const target = current.wallets.find((wallet) => wallet.id === normalizedWalletId);
            if (normalizedWalletId === favoriteWalletIdRef.current || !target || target.isActive) {
                return;
            }

            const deleted = permanentlyDeleteWalletData({
                walletId: normalizedWalletId,
                wallets: current.wallets,
                creditCards: current.creditCards,
                transactionGroups: current.transactionGroups,
                transactions: current.transactions,
                transactionTags: current.transactionTags,
                ledgerEntries: current.ledgerEntries,
            });

            const synced = withSyncedInvoices({
                creditCards: deleted.creditCards,
                transactionGroups: recalculateGroupTotals(deleted.transactionGroups, deleted.transactions),
                transactions: deleted.transactions,
                creditCardInvoices: current.creditCardInvoices,
            });
            const snapshot = buildSnapshot({
                wallets: deleted.wallets,
                creditCards: deleted.creditCards,
                creditCardInvoices: synced.creditCardInvoices,
                transactions: synced.transactions,
                transactionGroups: recalculateGroupTotals(synced.transactionGroups, synced.transactions),
                transactionTags: deleted.transactionTags,
                ledgerEntries: deleted.ledgerEntries,
                favoriteCreditCardId: resolveFavoriteCreditCardId(current.favoriteCreditCardId, deleted.creditCards),
            });

            commitSnapshot(snapshot);
            setFavoriteWalletId(resolveFavoriteWalletId(favoriteWalletIdRef.current, deleted.wallets));
            persistFullSnapshot(snapshot);
        },
        [buildSnapshot, commitSnapshot, favoriteWalletIdRef, persistFullSnapshot, setFavoriteWalletId, snapshotRef],
    );

    const addWallet = useCallback(
        async (newWallet: Wallet) => {
            commitWallets(upsertById(snapshotRef.current.wallets, normalizeWallet(newWallet)));
        },
        [commitWallets, snapshotRef],
    );

    /** A favorita precisa continuar válida quando as carteiras mudam (ex.: desativada em outra aba). */
    const wallets = state.snapshot.wallets;
    useEffect(() => {
        const resolvedFavoriteWalletId = resolveFavoriteWalletId(favoriteWalletIdRef.current, wallets);
        if (resolvedFavoriteWalletId === favoriteWalletIdRef.current) {
            return;
        }

        setFavoriteWalletId(resolvedFavoriteWalletId);
        persistFinanceFields({ favoriteWalletId: resolvedFavoriteWalletId });
    }, [favoriteWalletIdRef, persistFinanceFields, setFavoriteWalletId, wallets]);

    return useMemo(
        () => ({ setStartBalance, setFavoriteWallet, setWalletActive, deleteWallet, permanentlyDeleteWallet, addWallet }),
        [addWallet, deleteWallet, permanentlyDeleteWallet, setFavoriteWallet, setStartBalance, setWalletActive],
    );
}
