import { useCallback, useMemo } from "react";
import { DEFAULT_BENEFICIARY_NAME } from "../domainConstants";
import type { FinanceSnapshot, Transaction, TransactionDraft, TransactionSeriesScope, TransactionStatus } from "../domainTypes";
import type { BulkUpdateTransactionsDraft, FinanceActionsValue, UpdateTransactionDraft } from "../contextTypes";
import { normalizeTransactionStatus } from "../entityNormalization/transactionNormalizers";
import { createId, getTodayDate } from "../helpers";
import { assertInvoiceMutation } from "../invoiceMutations";
import { materializeOccurrence } from "../recurrence/materializeOccurrence";
import { materializeSeriesHorizon, recurringSeriesIdsOf } from "../recurrence/materializeSeriesHorizon";
import { createTransactionSnapshot } from "../transactionCreation/createTransactionSnapshot";
import { persistTransactionSeriesSnapshotAtomically, updateTransactionSeriesSnapshot, validateTransactionSeriesUpdateInvariants } from "../transactionSeries";
import { updateTransactionsBulkSnapshot } from "../transactionSeries/bulkUpdate";
import { deleteTransactionsSnapshot } from "../transactionSeries/deleteTransactions";
import { recalculateGroupTotals } from "../transactionSeries/helpers";
import { applyTransactionStatus } from "../transactionStatus";
import { withSyncedInvoices } from "./snapshotInvoices";
import type { FinanceStoreKernel } from "./storeKernel";
import { buildUserProfileData } from "../../../lib/userProfile";

type TransactionActions = Pick<
    FinanceActionsValue,
    | "addTransaction"
    | "updateTransaction"
    | "updateTransactionsBulk"
    | "materializeTransaction"
    | "markTransactionAsPaid"
    | "setTransactionStatus"
    | "deleteTransaction"
    | "deleteTransactionWithScope"
    | "clearTransactions"
>;

function normalizeSeriesScope(scope: TransactionSeriesScope | null | undefined): TransactionSeriesScope {
    return scope === "all" || scope === "this_and_next" ? scope : "single";
}

/** Toda mudança em séries recorrentes mantém o horizonte gravado uma janela inteira à frente. */
function rollSeriesHorizon(snapshot: FinanceSnapshot, transactionIds: string[]): FinanceSnapshot {
    return materializeSeriesHorizon(snapshot, getTodayDate(), recurringSeriesIdsOf(snapshot, transactionIds));
}

export function useTransactionActions({ user, state, persistFinanceFields, persistFullSnapshot }: FinanceStoreKernel): TransactionActions {
    const { snapshotRef, buildSnapshot, commitSnapshot } = state;

    const persistAndCommit = useCallback(
        (snapshot: FinanceSnapshot) => {
            persistFullSnapshot(snapshot);
            commitSnapshot(snapshot);
        },
        [commitSnapshot, persistFullSnapshot],
    );

    /** Refaz faturas e recalcula saldos/resumo sobre o snapshot transformado. */
    const rebuildWithInvoices = useCallback((snapshot: FinanceSnapshot) => buildSnapshot(withSyncedInvoices(snapshot)), [buildSnapshot]);

    const addTransaction = useCallback(
        async (draft: TransactionDraft) => {
            const before = buildSnapshot();
            const created = createTransactionSnapshot(before, draft, {
                userId: user?.uid,
                displayName: user ? buildUserProfileData(user).displayName : DEFAULT_BENEFICIARY_NAME,
            });
            const knownGroupIds = new Set(before.transactionGroups.map((group) => group.id));
            const newSeriesIds = new Set(created.transactionGroups.filter((group) => !knownGroupIds.has(group.id)).map((group) => group.id));
            const materialized = materializeSeriesHorizon(created, getTodayDate(), newSeriesIds);
            persistAndCommit(materialized === created ? created : rebuildWithInvoices(materialized));
        },
        [buildSnapshot, persistAndCommit, rebuildWithInvoices, user],
    );

    const materializeTransaction = useCallback(
        async (transactionId: string) => {
            const before = buildSnapshot();
            const next = materializeOccurrence(before, transactionId);
            if (next !== before) {
                persistAndCommit(rebuildWithInvoices(next));
            }
        },
        [buildSnapshot, persistAndCommit, rebuildWithInvoices],
    );

    const setTransactionStatus = useCallback(
        async (transaction: Transaction, status: TransactionStatus, effectiveDate?: string) => {
            const before = materializeOccurrence(buildSnapshot(), transaction.id);
            const changed = applyTransactionStatus(before, transaction.id, normalizeTransactionStatus(status), new Date().toISOString(), effectiveDate);
            if (changed !== before) {
                persistAndCommit(rebuildWithInvoices(rollSeriesHorizon(changed, [transaction.id])));
            }
        },
        [buildSnapshot, persistAndCommit, rebuildWithInvoices],
    );

    /** Só pendentes (ou ocorrências ainda projetadas) são pagas, na data de hoje. */
    const markTransactionAsPaid = useCallback(
        async (transaction: Transaction) => {
            const current = snapshotRef.current.transactions.find((item) => item.id === transaction.id);
            if (!current || current.status === "pending") {
                await setTransactionStatus(transaction, "paid", getTodayDate());
            }
        },
        [setTransactionStatus, snapshotRef],
    );

    const deleteTransactionWithScope = useCallback(
        async (transaction: Transaction, scope: TransactionSeriesScope = "single") => {
            persistAndCommit(buildSnapshot(deleteTransactionsSnapshot(buildSnapshot(), transaction.id, scope)));
        },
        [buildSnapshot, persistAndCommit],
    );

    const deleteTransaction = useCallback(async (transaction: Transaction) => deleteTransactionWithScope(transaction, "single"), [deleteTransactionWithScope]);

    const updateTransactionsBulk = useCallback(
        async (draft: BulkUpdateTransactionsDraft) => {
            const before = buildSnapshot();
            const bulkUpdated = updateTransactionsBulkSnapshot(before, draft);
            const snapshot = rebuildWithInvoices(draft.status ? rollSeriesHorizon(bulkUpdated, draft.transactionIds) : bulkUpdated);
            assertInvoiceMutation(before, snapshot);
            persistAndCommit(snapshot);
        },
        [buildSnapshot, persistAndCommit, rebuildWithInvoices],
    );

    const updateTransaction = useCallback(
        async ({ transaction, draft, scope = "single" }: UpdateTransactionDraft) => {
            const before = materializeOccurrence(buildSnapshot(), transaction.id);
            const normalizedScope = normalizeSeriesScope(scope);
            const transformed = updateTransactionSeriesSnapshot({
                snapshot: before,
                transactionId: transaction.id,
                wasProjected: !snapshotRef.current.transactions.some((item) => item.id === transaction.id),
                draft,
                scope: normalizedScope,
                createGroupId: () => createId("group"),
                now: new Date().toISOString(),
            });
            const synced = withSyncedInvoices(rollSeriesHorizon(transformed.snapshot, [transaction.id]));
            const snapshot = buildSnapshot({
                transactionGroups: recalculateGroupTotals(synced.transactionGroups, synced.transactions),
                transactions: synced.transactions,
                creditCardInvoices: synced.creditCardInvoices,
                ledgerEntries: synced.ledgerEntries,
                transactionTags: synced.transactionTags,
            });

            validateTransactionSeriesUpdateInvariants({
                before,
                after: snapshot,
                affectedTransactionIds: transformed.affectedTransactionIds,
                metadataOnly: transformed.metadataOnly,
                preservePaidTransactions: normalizedScope !== "single",
            });

            await persistTransactionSeriesSnapshotAtomically({ snapshot, persist: persistFullSnapshot, commit: commitSnapshot });
        },
        [buildSnapshot, commitSnapshot, persistFullSnapshot, snapshotRef],
    );

    const clearTransactions = useCallback(async () => {
        const snapshot = buildSnapshot({ transactionGroups: [], transactions: [], ledgerEntries: [], transactionTags: [], creditCardInvoices: [] });
        commitSnapshot(snapshot);
        persistFinanceFields({ wallets: snapshot.wallets, transactionGroups: [], transactions: [], ledgerEntries: [], transactionTags: [], creditCardInvoices: [] });
    }, [buildSnapshot, commitSnapshot, persistFinanceFields]);

    return useMemo(
        () => ({
            addTransaction,
            updateTransaction,
            updateTransactionsBulk,
            materializeTransaction,
            markTransactionAsPaid,
            setTransactionStatus,
            deleteTransaction,
            deleteTransactionWithScope,
            clearTransactions,
        }),
        [addTransaction, clearTransactions, deleteTransaction, deleteTransactionWithScope, markTransactionAsPaid, materializeTransaction, setTransactionStatus, updateTransaction, updateTransactionsBulk],
    );
}
