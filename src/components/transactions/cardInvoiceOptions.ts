import type { CreditCard, CreditCardInvoice } from "../../context/finance/domainTypes";
import { buildCreditCardInvoiceId, getCreditCardInvoiceMonthKey, resolveCreditCardInvoiceCycleFromCycleKey } from "../../context/finance/financeCore";
import { getCreditCardInvoiceReadState, type CreditCardInvoiceVisualStatus } from "../../context/finance/invoiceStatus";
import { addMonthsToLocalDate } from "../../lib/localDate";
import { formatMonthLabel } from "../../lib/monthKey";
import type { ComboboxOptionBase } from "./SingleSelectCombobox";

export interface InvoiceOption extends ComboboxOptionBase {
    invoice: CreditCardInvoice;
    visualStatus: CreditCardInvoiceVisualStatus | "forecast";
    monthLabel: string;
    cycleKey: string;
}

export const INVOICE_STATUS_LABELS: Record<InvoiceOption["visualStatus"], string> = {
    open: "Aberta", future: "Futura", closed: "Fechada", overdue: "Vencida", paid: "Paga · consulta", forecast: "Previsão",
};

export { formatMonthLabel };
export function shiftCycleKey(cycleKey: string, offset: number): string {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(cycleKey)) return "";
    return addMonthsToLocalDate(`${cycleKey}-01`, offset).slice(0, 7);
}

export function buildCardInvoiceOptions(card: CreditCard | null, invoices: CreditCardInvoice[], cycleKeys: string[], referenceDate = new Date()): InvoiceOption[] {
    if (!card) return [];
    const byCycle = new Map(invoices.filter((invoice) => invoice.creditCardId === card.id).map((invoice) => [invoice.cycleKey, invoice]));
    for (const cycleKey of cycleKeys.filter(Boolean)) {
        // A historical custom ID still owns its cycle. Never create a second,
        // unpaid option alongside a paid canonical invoice for that cycle.
        if (byCycle.has(cycleKey)) continue;
        byCycle.set(cycleKey, { id: buildCreditCardInvoiceId(card.id, cycleKey), creditCardId: card.id,
            ...resolveCreditCardInvoiceCycleFromCycleKey(cycleKey, card.closingDay, card.dueDay),
            totalAmount: 0, paidAmount: 0, status: "open", paidAt: null, createdAt: referenceDate.toISOString(), updatedAt: referenceDate.toISOString() });
    }
    return [...byCycle.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id)).map((invoice) => {
        const visualStatus = invoice.totalAmount === 0 && (invoice.forecastAmount ?? 0) > 0 ? "forecast" : getCreditCardInvoiceReadState(invoice, card, referenceDate).visualStatus;
        const monthLabel = formatMonthLabel(getCreditCardInvoiceMonthKey(invoice));
        return { id: invoice.id, invoice, visualStatus, monthLabel, cycleKey: invoice.cycleKey, disabled: invoice.status === "paid",
            searchText: `${monthLabel} ${invoice.cycleKey} ${INVOICE_STATUS_LABELS[visualStatus]}`, label: `${monthLabel} (${invoice.cycleKey})` };
    });
}
