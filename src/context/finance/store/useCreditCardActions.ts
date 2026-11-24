import { useCallback, useEffect, useMemo } from "react";
import type { CreditCard } from "../domainTypes";
import type { FinanceActionsValue, PayCreditCardInvoiceDraft, SetCreditCardInvoicesPaidStateDraft, UpdateInvoicePaymentTransactionDraft } from "../contextTypes";
import { normalizeCreditCard } from "../entityNormalization/walletNormalizers";
import { createId } from "../helpers";
import { buildInvoiceSettlement } from "../invoiceSettlement";
import { permanentlyDeleteCreditCardData } from "../permanentDeletion";
import { recalculateGroupTotals } from "../transactionSeries/helpers";
import { compareCreditCardsByCreatedAt, resolveFavoriteCreditCardId } from "./favoriteSelection";
import { buildInvoicePayment, buildInvoicePaymentEdit } from "./invoicePaymentCommands";
import { setActiveById, upsertById } from "./registryCommands";
import { withSyncedInvoices } from "./snapshotInvoices";
import type { FinanceStoreKernel } from "./storeKernel";

type CreditCardActions = Pick<
    FinanceActionsValue,
    | "addCreditCard"
    | "setFavoriteCreditCard"
    | "setCreditCardActive"
    | "deleteCreditCard"
    | "permanentlyDeleteCreditCard"
    | "payCreditCardInvoice"
    | "setCreditCardInvoicesPaidState"
    | "updateInvoicePaymentTransaction"
>;

export function useCreditCardActions({ user, state, persistFinanceFields, persistFullSnapshot }: FinanceStoreKernel): CreditCardActions {
    const { snapshotRef, buildSnapshot, commitSnapshot } = state;
    const userId = user?.uid ?? null;

    /** Troca a lista de cartões, refaz as faturas e mantém o favorito válido. */
    const commitCreditCards = useCallback(
        (creditCards: CreditCard[]) => {
            const current = snapshotRef.current;
            const synced = withSyncedInvoices({ ...current, creditCards });
            const snapshot = buildSnapshot({
                creditCards,
                creditCardInvoices: synced.creditCardInvoices,
                transactions: synced.transactions,
                favoriteCreditCardId: resolveFavoriteCreditCardId(current.favoriteCreditCardId, creditCards),
            });
            commitSnapshot(snapshot);
            persistFinanceFields({
                creditCards: snapshot.creditCards,
                creditCardInvoices: snapshot.creditCardInvoices,
                transactions: snapshot.transactions,
                favoriteCreditCardId: snapshot.favoriteCreditCardId,
            });
        },
        [buildSnapshot, commitSnapshot, persistFinanceFields, snapshotRef],
    );

    const addCreditCard = useCallback(
        async (newCreditCard: CreditCard) => {
            const current = snapshotRef.current;
            const card = normalizeCreditCard(newCreditCard, new Set(current.wallets.map((wallet) => wallet.id)));
            commitCreditCards(upsertById(current.creditCards, card).sort(compareCreditCardsByCreatedAt));
        },
        [commitCreditCards, snapshotRef],
    );

    const setFavoriteCreditCard = useCallback(
        async (creditCardId: string) => {
            const current = snapshotRef.current;
            const nextFavoriteCreditCardId = resolveFavoriteCreditCardId(creditCardId, current.creditCards);
            if (current.favoriteCreditCardId === nextFavoriteCreditCardId) {
                return;
            }

            commitSnapshot({ ...current, favoriteCreditCardId: nextFavoriteCreditCardId });
            persistFinanceFields({ favoriteCreditCardId: nextFavoriteCreditCardId });
        },
        [commitSnapshot, persistFinanceFields, snapshotRef],
    );

    const setCreditCardActive = useCallback(
        async (creditCardId: string, isActive: boolean) => {
            const result = setActiveById(snapshotRef.current.creditCards, creditCardId, isActive);
            if (result.changed) {
                commitCreditCards(result.items.sort(compareCreditCardsByCreatedAt));
            }
        },
        [commitCreditCards, snapshotRef],
    );

    const deleteCreditCard = useCallback(
        async (creditCardId: string) => {
            const target = snapshotRef.current.creditCards.find((card) => card.id === creditCardId);
            if (target?.isActive) {
                await setCreditCardActive(creditCardId, false);
            }
        },
        [setCreditCardActive, snapshotRef],
    );

    /** Só cartões já desativados podem ser apagados de vez; `keepPayments` preserva os pagamentos de fatura. */
    const permanentlyDeleteCreditCard = useCallback(
        async (creditCardId: string, options?: { keepPayments?: boolean }) => {
            const current = snapshotRef.current;
            const target = current.creditCards.find((card) => card.id === creditCardId);
            if (!target || target.isActive) {
                return;
            }

            const deleted = permanentlyDeleteCreditCardData({
                creditCardId,
                keepPayments: options?.keepPayments,
                creditCards: current.creditCards,
                creditCardInvoices: current.creditCardInvoices,
                transactionGroups: current.transactionGroups,
                transactions: current.transactions,
                transactionTags: current.transactionTags,
                ledgerEntries: current.ledgerEntries,
            });
            const synced = withSyncedInvoices({
                creditCards: deleted.creditCards,
                transactionGroups: recalculateGroupTotals(deleted.transactionGroups, deleted.transactions),
                transactions: deleted.transactions,
                creditCardInvoices: deleted.creditCardInvoices,
            });
            const snapshot = buildSnapshot({
                creditCards: deleted.creditCards,
                creditCardInvoices: synced.creditCardInvoices,
                transactions: synced.transactions,
                transactionGroups: recalculateGroupTotals(synced.transactionGroups, synced.transactions),
                transactionTags: deleted.transactionTags,
                ledgerEntries: deleted.ledgerEntries,
                favoriteCreditCardId: resolveFavoriteCreditCardId(current.favoriteCreditCardId, deleted.creditCards),
            });

            persistFullSnapshot(snapshot);
            commitSnapshot(snapshot);
        },
        [buildSnapshot, commitSnapshot, persistFullSnapshot, snapshotRef],
    );

    const payCreditCardInvoice = useCallback(
        async (draft: PayCreditCardInvoiceDraft) => {
            const changes = buildInvoicePayment({
                snapshot: snapshotRef.current,
                draft,
                userId,
                transactionId: createId("tx-invoice-payment"),
                nowIso: new Date().toISOString(),
            });
            if (!changes) {
                return;
            }

            const snapshot = buildSnapshot(changes);
            persistFullSnapshot(snapshot);
            commitSnapshot(snapshot);
        },
        [buildSnapshot, commitSnapshot, persistFullSnapshot, snapshotRef, userId],
    );

    const setCreditCardInvoicesPaidState = useCallback(
        async ({ invoiceIds, markAsPaid }: SetCreditCardInvoicesPaidStateDraft) => {
            const current = snapshotRef.current;
            const settlement = buildInvoiceSettlement({
                invoiceIds,
                markAsPaid,
                userId,
                invoices: current.creditCardInvoices,
                transactionGroups: current.transactionGroups,
                transactions: current.transactions,
                ledgerEntries: current.ledgerEntries,
                beneficiaries: current.beneficiaries,
                categories: current.categories,
            });
            if (!settlement.changed) {
                return;
            }

            const snapshot = buildSnapshot({
                creditCardInvoices: settlement.invoices,
                transactionGroups: settlement.transactionGroups,
                transactions: settlement.transactions,
                ledgerEntries: settlement.ledgerEntries,
            });
            persistFullSnapshot(snapshot);
            commitSnapshot(snapshot);
        },
        [buildSnapshot, commitSnapshot, persistFullSnapshot, snapshotRef, userId],
    );

    const updateInvoicePaymentTransaction = useCallback(
        async (draft: UpdateInvoicePaymentTransactionDraft) => {
            const changes = buildInvoicePaymentEdit({ snapshot: snapshotRef.current, draft, userId, nowIso: new Date().toISOString() });
            if (!changes) {
                return;
            }

            const snapshot = buildSnapshot(changes);
            persistFullSnapshot(snapshot);
            commitSnapshot(snapshot);
        },
        [buildSnapshot, commitSnapshot, persistFullSnapshot, snapshotRef, userId],
    );

    /** O favorito precisa continuar válido quando os cartões mudam. */
    const creditCards = state.snapshot.creditCards;
    useEffect(() => {
        const current = snapshotRef.current;
        const resolvedFavoriteCreditCardId = resolveFavoriteCreditCardId(current.favoriteCreditCardId, creditCards);
        if (resolvedFavoriteCreditCardId === current.favoriteCreditCardId) {
            return;
        }

        commitSnapshot({ ...current, favoriteCreditCardId: resolvedFavoriteCreditCardId });
        persistFinanceFields({ favoriteCreditCardId: resolvedFavoriteCreditCardId });
    }, [commitSnapshot, creditCards, persistFinanceFields, snapshotRef]);

    return useMemo(
        () => ({
            addCreditCard,
            setFavoriteCreditCard,
            setCreditCardActive,
            deleteCreditCard,
            permanentlyDeleteCreditCard,
            payCreditCardInvoice,
            setCreditCardInvoicesPaidState,
            updateInvoicePaymentTransaction,
        }),
        [addCreditCard, deleteCreditCard, payCreditCardInvoice, permanentlyDeleteCreditCard, setCreditCardActive, setCreditCardInvoicesPaidState, setFavoriteCreditCard, updateInvoicePaymentTransaction],
    );
}
