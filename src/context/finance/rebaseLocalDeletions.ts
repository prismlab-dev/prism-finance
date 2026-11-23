import type { SupabaseFinanceData } from "../../supabase/finance";
import { roundToCents } from "./helpers";
import { listCardWalletPayments, permanentlyDeleteCreditCardData } from "./permanentDeletion";
import { recalculateGroupTotals } from "./transactionSeries/helpers";

interface MergeInputs {
    baseData: SupabaseFinanceData;
    remoteData: SupabaseFinanceData;
    targetData: SupabaseFinanceData;
}

function withoutCard(data: SupabaseFinanceData, creditCardId: string, keepPayments: boolean): SupabaseFinanceData {
    const deleted = permanentlyDeleteCreditCardData({ ...data, creditCardId, keepPayments });
    const keptIds = new Set(deleted.transactions.map((item) => item.id));
    const reducedGroupIds = new Set(data.transactions.filter((item) => !keptIds.has(item.id)).map((item) => item.groupId));
    const recalculated = recalculateGroupTotals(deleted.transactionGroups, deleted.transactions);
    const transactionGroups = deleted.transactionGroups.map((group, index) => (group.removedInstallments || reducedGroupIds.has(group.id) ? recalculated[index] : group));
    return { ...data, ...deleted, transactionGroups };
}

/**
 * A card deletion is an operation, not a list of rows: replay it over the confirmed
 * data, so installments moved out of the card meanwhile survive and every erased
 * one is recorded.
 */
function replayCardDeletions({ baseData, remoteData, targetData }: MergeInputs): MergeInputs {
    const targetCardIds = new Set(targetData.creditCards.map((card) => card.id));
    const deletedCardIds = baseData.creditCards.map((card) => card.id).filter((id) => !targetCardIds.has(id));
    if (deletedCardIds.length === 0) return { baseData, remoteData, targetData };

    let base = baseData;
    let remote = remoteData;
    const targetIds = new Set(targetData.transactions.map((item) => item.id));
    for (const cardId of deletedCardIds) {
        // The payments still in this device tell what the user chose; those it never saw were not offered for deletion.
        const payments = listCardWalletPayments(baseData, cardId);
        const keepPayments = payments.length === 0 || payments.some((item) => targetIds.has(item.transaction.id));
        base = withoutCard(base, cardId, keepPayments);
        if (remoteData.creditCards.some((card) => card.id === cardId)) remote = withoutCard(remote, cardId, keepPayments);
    }

    // Installments this device moved out before deleting the card still merge by field.
    const replayedIds = new Set(base.transactions.map((item) => item.id));
    const movedHere = baseData.transactions.filter((item) => targetIds.has(item.id) && !replayedIds.has(item.id));
    const movedIds = new Set(movedHere.map((item) => item.id));
    return {
        baseData: { ...base, transactions: base.transactions.concat(movedHere) },
        remoteData: {
            ...remote,
            transactions: remote.transactions.filter((item) => !movedIds.has(item.id)).concat(remoteData.transactions.filter((item) => movedIds.has(item.id))),
        },
        targetData,
    };
}

/** The server rejects erasing charges of an invoice paid meanwhile: the payment wins and the purchase stays whole. */
function keepChargesPaidRemotely({ baseData, remoteData, targetData }: MergeInputs): MergeInputs {
    const basePaid = new Map(baseData.creditCardInvoices.map((invoice) => [invoice.id, invoice.paidAmount]));
    const newlyPaid = new Set(remoteData.creditCardInvoices.filter((invoice) => invoice.paidAmount > (basePaid.get(invoice.id) ?? 0)).map((invoice) => invoice.id));
    const targetIds = new Set(targetData.transactions.map((item) => item.id));
    const targetGroups = new Map(targetData.transactionGroups.map((group) => [group.id, group]));
    const remoteById = new Map(remoteData.transactions.map((item) => [item.id, item]));
    const deleted = baseData.transactions.filter((item) => !targetIds.has(item.id) && remoteById.has(item.id));
    const blockedGroupIds = new Set(deleted.filter((item) => newlyPaid.has(remoteById.get(item.id)?.invoiceId ?? "")).map((item) => item.groupId));
    const groups = baseData.transactionGroups.filter((group) => {
        const local = targetGroups.get(group.id);
        return blockedGroupIds.has(group.id) && group.transactionMode !== "recurring" && (!local || local.transactionMode === group.transactionMode);
    });
    if (groups.length === 0) return { baseData, remoteData, targetData };

    const groupsById = new Map(groups.map((group) => [group.id, group]));
    const restored = deleted.filter((item) => groupsById.has(item.groupId));
    const restoredIds = new Set(restored.map((item) => item.id));
    const restoredTotals = new Map<string, number>();
    for (const item of restored) {
        if (!item.invoiceId || item.commitment === "forecast" || item.status === "cancelled" || item.status === "skipped") continue;
        restoredTotals.set(item.invoiceId, (restoredTotals.get(item.invoiceId) ?? 0) + Math.abs(item.amount));
    }
    const targetInvoiceIds = new Set(targetData.creditCardInvoices.map((invoice) => invoice.id));
    return {
        baseData,
        remoteData,
        targetData: {
            ...targetData,
            transactions: targetData.transactions.concat(restored),
            transactionGroups: targetData.transactionGroups
                .map((group) => {
                    const original = groupsById.get(group.id);
                    return original ? { ...group, totalAmount: original.totalAmount, installmentCount: original.installmentCount } : group;
                })
                .concat(groups.filter((group) => !targetGroups.has(group.id))),
            creditCardInvoices: targetData.creditCardInvoices
                .map((invoice) => (restoredTotals.has(invoice.id) ? { ...invoice, totalAmount: roundToCents(invoice.totalAmount + restoredTotals.get(invoice.id)!) } : invoice))
                .concat(baseData.creditCardInvoices.filter((invoice) => restoredTotals.has(invoice.id) && !targetInvoiceIds.has(invoice.id))),
            transactionTags: targetData.transactionTags.concat(baseData.transactionTags.filter((link) => restoredIds.has(link.transactionId))),
            ledgerEntries: targetData.ledgerEntries.concat(baseData.ledgerEntries.filter((entry) => entry.transactionId && restoredIds.has(entry.transactionId))),
        },
    };
}

export function rebaseLocalDeletions(inputs: MergeInputs): MergeInputs {
    return keepChargesPaidRemotely(replayCardDeletions(inputs));
}
