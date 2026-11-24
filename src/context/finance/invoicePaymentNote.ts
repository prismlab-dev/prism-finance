import { INVOICE_PAYMENT_NOTE_PREFIX } from "./domainConstants";
import type { InvoicePaymentMeta, StoredTransaction } from "./domainTypes";

/** Nota legada que marca uma transação como pagamento de fatura (anterior a `paymentForInvoiceId`). */
export function buildInvoicePaymentNote(payload: InvoicePaymentMeta): string {
    return `${INVOICE_PAYMENT_NOTE_PREFIX}|${payload.invoiceId}|${payload.creditCardId}`;
}

export function parseInvoicePaymentNote(note: string | null): InvoicePaymentMeta | null {
    if (!note || !note.startsWith(`${INVOICE_PAYMENT_NOTE_PREFIX}|`)) {
        return null;
    }

    const [, invoiceId = "", creditCardId = ""] = note.split("|");
    if (!invoiceId || !creditCardId) {
        return null;
    }

    return {
        invoiceId,
        creditCardId,
    };
}

/** Pagamento de fatura identificado pelo campo novo ou pela nota legada. */
export function isInvoicePaymentTransaction(transaction: Pick<StoredTransaction, "paymentForInvoiceId" | "notes">): boolean {
    return Boolean(transaction.paymentForInvoiceId || parseInvoicePaymentNote(transaction.notes));
}
