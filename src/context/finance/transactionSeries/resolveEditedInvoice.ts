import { addMonthsToLocalDate } from "../../../lib/localDate";
import { buildCreditCardInvoiceId, parseCreditCardInvoiceId, resolveCreditCardInvoiceCycle } from "../financeCore";
import type { FinanceSnapshot } from "../domainTypes";

export function resolveEditedInvoice(snapshot: FinanceSnapshot, cardId: string, date: string, requestedInvoiceId: string | null, offset: number): string {
    const card = snapshot.creditCards.find((item) => item.id === cardId);
    if (!card) throw new Error("Cartão não encontrado.");
    // The form also offers future invoices that are not stored yet.
    const requestedInvoice = snapshot.creditCardInvoices.find((item) => item.id === requestedInvoiceId) ?? parseCreditCardInvoiceId(requestedInvoiceId ?? "");
    const anchorCycle = requestedInvoice?.creditCardId === cardId ? requestedInvoice.cycleKey : resolveCreditCardInvoiceCycle(date, card.closingDay, card.dueDay).cycleKey;
    const cycleKey = addMonthsToLocalDate(`${anchorCycle}-01`, offset).slice(0, 7);
    return snapshot.creditCardInvoices.find((item) => item.creditCardId === cardId && item.cycleKey === cycleKey)?.id ?? buildCreditCardInvoiceId(cardId, cycleKey);
}
