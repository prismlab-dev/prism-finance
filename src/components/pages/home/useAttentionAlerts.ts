import { useMemo } from "react";
import { type Transaction, useFinanceCreditCardInvoices, useFinanceCreditCards } from "../../../context/FinanceContext";
import { getCreditCardInvoiceReadState } from "../../../context/finance/invoiceStatus";
import { getMonthKeyFromDateValue } from "../../../context/financeTypes";
import { parseAppDate } from "../../../lib/localDate";

export interface OverdueInvoiceByCardAlert {
    cardId: string;
    cardName: string;
    // Month key (YYYY-MM) used by statement navigation, based on due date.
    selectedMonth: string;
    selectedDueDate: string;
    openAmount: number;
    overdueInvoiceCount: number;
}

export interface OverdueInvoiceAlert {
    invoiceId: string;
    cardId: string;
    cardName: string;
    selectedMonth: string;
    dueDate: string;
    openAmount: number;
}

function isDateBeforeToday(dateValue: string, today: Date): boolean {
    const parsedDate = parseAppDate(dateValue);
    if (!parsedDate) {
        return false;
    }

    const normalizedDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    return normalizedDate.getTime() < today.getTime();
}

// Avisos de "Precisa de atenção": despesas atrasadas fora do cartão e faturas vencidas por cartão.
export function useAttentionAlerts(transactions: Transaction[]) {
    const creditCards = useFinanceCreditCards();
    const creditCardInvoices = useFinanceCreditCardInvoices();

    const overdueNonCardSpendings = useMemo(() => {
        const todayReference = new Date();
        const today = new Date(todayReference.getFullYear(), todayReference.getMonth(), todayReference.getDate());

        return transactions.filter(
            (transaction) =>
                transaction.type === "spending" &&
                transaction.status === "pending" &&
                transaction.paymentMethod !== "credit_card" &&
                isDateBeforeToday(transaction.date, today),
        );
    }, [transactions]);

    const { overdueInvoiceAlertsByCard, overdueInvoices } = useMemo(() => {
        const cardById = new Map(creditCards.map((card) => [card.id, card]));
        const alertsByCard = new Map<string, OverdueInvoiceByCardAlert>();
        const invoices: OverdueInvoiceAlert[] = [];

        creditCardInvoices.forEach((invoice) => {
            const card = cardById.get(invoice.creditCardId) ?? null;
            const { openAmount, hasPendingBalance, visualStatus } = getCreditCardInvoiceReadState(invoice, card);
            if (!hasPendingBalance || visualStatus !== "overdue") {
                return;
            }

            const invoiceDueMonth = getMonthKeyFromDateValue(invoice.dueDate);
            invoices.push({
                invoiceId: invoice.id,
                cardId: invoice.creditCardId,
                cardName: card?.name ?? "Cartao removido",
                selectedMonth: invoiceDueMonth,
                dueDate: invoice.dueDate,
                openAmount,
            });
            const existing = alertsByCard.get(invoice.creditCardId);
            if (!existing) {
                alertsByCard.set(invoice.creditCardId, {
                    cardId: invoice.creditCardId,
                    cardName: card?.name ?? "Cartao removido",
                    selectedMonth: invoiceDueMonth,
                    selectedDueDate: invoice.dueDate,
                    openAmount,
                    overdueInvoiceCount: 1,
                });
                return;
            }

            const isEarlier = invoice.dueDate < existing.selectedDueDate;
            alertsByCard.set(invoice.creditCardId, {
                ...existing,
                selectedMonth: isEarlier ? invoiceDueMonth : existing.selectedMonth,
                selectedDueDate: isEarlier ? invoice.dueDate : existing.selectedDueDate,
                openAmount: existing.openAmount + openAmount,
                overdueInvoiceCount: existing.overdueInvoiceCount + 1,
            });
        });

        return {
            overdueInvoiceAlertsByCard: Array.from(alertsByCard.values()).sort((a, b) => a.selectedDueDate.localeCompare(b.selectedDueDate)),
            overdueInvoices: invoices.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
        };
    }, [creditCardInvoices, creditCards]);

    const overdueCount = overdueNonCardSpendings.length;
    const overdueTotal = overdueNonCardSpendings.reduce((sum, transaction) => sum + transaction.value, 0);
    const alertCount = (overdueCount > 0 ? 1 : 0) + overdueInvoiceAlertsByCard.length;

    return { overdueNonCardSpendings, overdueCount, overdueTotal, overdueInvoiceAlertsByCard, overdueInvoices, alertCount };
}
