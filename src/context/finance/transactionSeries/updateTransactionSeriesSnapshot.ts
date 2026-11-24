import { addMonthsToLocalDate } from "../../../lib/localDate";
import { resolveTransactionCreditCardId } from "../financeCore";
import type { FinanceSnapshot, StoredTransaction, TransactionDraft, TransactionSeriesScope } from "../domainTypes";
import { updateRecurringSeries } from "../recurrence/updateRecurringSeries";
import { assertInvoiceMutation } from "../invoiceMutations";
import { buildPatchedMetadataGroup, resolveDraft } from "./draft";
import { recalculateGroupTotals, replaceTransactionTags } from "./helpers";
import { updateLedger } from "./updateLedger";
import { validateTransactionSeriesUpdateInvariants } from "./invariants";
import { isEditableInScope, isSkippedSibling } from "./installmentScope";
import { resolveEditedInvoice } from "./resolveEditedInvoice";
import { seriesChanges } from "../recurrence/seriesChanges";
import { convertTransactionModeSnapshot } from "./convertTransactionMode";

export interface TransactionSeriesUpdateResult {
    snapshot: FinanceSnapshot;
    affectedTransactionIds: Set<string>;
    financiallyAffectedTransactionIds: Set<string>;
    metadataOnly: boolean;
}

export interface UpdateTransactionSeriesSnapshotParams {
    snapshot: FinanceSnapshot;
    transactionId: string;
    draft: TransactionDraft;
    scope: TransactionSeriesScope;
    createGroupId?: () => string;
    now?: string;
    wasProjected?: boolean;
}

/** Single transactions and installments are explicit commitments. */
export function updateTransactionSeriesSnapshot(params: UpdateTransactionSeriesSnapshotParams): TransactionSeriesUpdateResult {
    const { snapshot, transactionId, draft } = params;
    const selected = snapshot.transactions.find((item) => item.id === transactionId);
    if (!selected) throw new Error("Transação não encontrada.");
    const group = snapshot.transactionGroups.find((item) => item.id === selected.groupId);
    if (!group) throw new Error("Grupo da transação não encontrado.");
    if (draft.transactionMode && draft.transactionMode !== group.transactionMode) {
        const result = convertTransactionModeSnapshot(params);
        assertInvoiceMutation(snapshot, result.snapshot);
        validateTransactionSeriesUpdateInvariants({
            before: snapshot,
            after: result.snapshot,
            affectedTransactionIds: result.affectedTransactionIds,
            metadataOnly: false,
            preservePaidTransactions: params.scope !== "single",
        });
        return result;
    }
    if (group.transactionMode === "recurring") {
        const result = updateRecurringSeries(params);
        assertInvoiceMutation(snapshot, result.snapshot);
        validateTransactionSeriesUpdateInvariants({ before: snapshot, after: result.snapshot, affectedTransactionIds: result.affectedTransactionIds,
            metadataOnly: result.metadataOnly, preservePaidTransactions: params.scope !== "single" });
        return result;
    }
    const resolved = resolveDraft(snapshot, selected, group, draft);
    const changes = seriesChanges(resolveDraft(snapshot, selected, group, {}), resolved);
    const scope = group.transactionMode === "single" ? "single" : params.scope;
    const affectedTransactionIds = new Set<string>();
    const now = params.now ?? new Date().toISOString();
    const targetGroup = group.transactionMode === "single" ? {
        ...buildPatchedMetadataGroup(snapshot, group, resolved),
        sourceWalletId: resolved.sourceWalletId, destinationWalletId: resolved.destinationWalletId, creditCardId: resolved.creditCardId,
    } : scope === "all" && [changes.description, changes.categoryId, changes.beneficiaryId, changes.notes].some((value) => value !== undefined)
        // The series view reads the purchase from the group.
        ? buildPatchedMetadataGroup(snapshot, group, resolved) : group;
    // The series form sends every installment amount; the paid ones are not editable and keep theirs.
    const amounts = scope === "all" && group.transactionMode === "installment" ? draft.installmentAmounts ?? null : null;
    if (amounts?.some((value) => !Number.isFinite(value) || Math.round(value * 100) < 1)) throw new Error("Cada parcela precisa ter pelo menos R$ 0,01.");
    const installmentAmount = (transaction: StoredTransaction) => amounts?.[(transaction.installmentNumber ?? 1) - 1];
    const nextTransactions = snapshot.transactions.map((transaction): StoredTransaction => {
        if (transaction.groupId !== group.id) return transaction;
        const selectedOnly = transaction.id === transactionId;
        if (!isEditableInScope(transaction, selected, scope, snapshot.creditCardInvoices)) return transaction;
        // Skipped siblings follow the series, or they would share an invoice with a moved installment.
        const skippedSibling = isSkippedSibling(transaction, selected, scope);
        const rowDraft = scope === "single"
            ? resolved
            : resolveDraft(snapshot, transaction, group, selectedOnly && draft.commitment !== undefined ? { ...changes, commitment: resolved.commitment } : changes);
        const status = skippedSibling ? transaction.status : rowDraft.status;
        const dateChanged = resolved.scheduledDate !== selected.scheduledDate;
        const cardChanged = resolved.creditCardId !== resolveTransactionCreditCardId(selected, group);
        const offset = scope === "single" ? 0 : (transaction.installmentNumber ?? 1) - (selected.installmentNumber ?? 1);
        const walletOffset = cardChanged && !rowDraft.creditCardId && scope !== "single" ? (transaction.installmentNumber ?? 1) - 1 : offset;
        const date = dateChanged || cardChanged ? addMonthsToLocalDate(resolved.scheduledDate, rowDraft.creditCardId ? 0 : walletOffset) : transaction.scheduledDate;
        let invoiceId = selectedOnly ? resolved.invoiceId : transaction.invoiceId;
        const invoiceChanged = resolved.invoiceId !== selected.invoiceId;
        if ((dateChanged || cardChanged || invoiceChanged) && rowDraft.creditCardId) {
            const invoiceOffset = scope === "single" ? 0 : resolved.invoiceId ? offset : (transaction.installmentNumber ?? 1) - 1;
            invoiceId = resolveEditedInvoice(snapshot, rowDraft.creditCardId, date, resolved.invoiceId, invoiceOffset);
        } else if (!rowDraft.creditCardId) {
            invoiceId = null;
        }
        // An invoice with payments accepts no charges; a skipped row must not block the whole edit.
        if (skippedSibling && invoiceId !== transaction.invoiceId && snapshot.creditCardInvoices.some((item) => item.id === invoiceId && item.paidAmount > 0)) return transaction;
        affectedTransactionIds.add(transaction.id);
        return {
            ...transaction,
            routingOverride: true,
            amount: skippedSibling ? transaction.amount : installmentAmount(transaction) ?? (resolved.amount === selected.amount ? transaction.amount : resolved.amount),
            scheduledDate: date, status, commitment: status === "paid" ? "posted" : rowDraft.commitment,
            paidAt: status === "paid" ? transaction.paidAt ?? now : null,
            invoiceId, title: rowDraft.title, notes: rowDraft.notes, categoryId: rowDraft.categoryId, beneficiaryId: rowDraft.beneficiaryId,
            sourceWalletId: rowDraft.sourceWalletId, destinationWalletId: rowDraft.destinationWalletId, creditCardId: rowDraft.creditCardId,
        };
    });
    // A edição pela página da equipe reenvia a divisão e a categoria da equipe.
    const editedGroup = draft.teamExpense ? { ...targetGroup, teamExpense: draft.teamExpense } : targetGroup;
    const nextGroups = recalculateGroupTotals(snapshot.transactionGroups.map((item) => item.id === group.id ? editedGroup : item), nextTransactions);
    const ledger = updateLedger({ before: snapshot, groups: nextGroups, transactions: nextTransactions, affectedTransactionIds });
    const nextSnapshot = {
        ...snapshot, transactionGroups: nextGroups, transactions: nextTransactions, ledgerEntries: ledger.ledgerEntries,
        transactionTags: (scope === "single" ? draft.tagIds : changes.tagIds) ? replaceTransactionTags(snapshot.transactionTags, affectedTransactionIds, resolved.tagIds) : snapshot.transactionTags,
    };
    const metadataOnly = ledger.financiallyAffectedTransactionIds.size === 0;
    assertInvoiceMutation(snapshot, nextSnapshot);
    validateTransactionSeriesUpdateInvariants({ before: snapshot, after: nextSnapshot, affectedTransactionIds, metadataOnly, preservePaidTransactions: scope !== "single" });
    return { snapshot: nextSnapshot, affectedTransactionIds, financiallyAffectedTransactionIds: ledger.financiallyAffectedTransactionIds, metadataOnly };
}
