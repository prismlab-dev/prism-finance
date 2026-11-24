import type { BeneficiaryType, CategoryType, InvoiceStatus, TransactionGroupType, TransactionMode, TransactionType, WalletType } from "./domainTypes";

export function asWalletType(value: unknown): WalletType {
    if (value === "checking" || value === "savings" || value === "cash" || value === "investment") {
        return value;
    }
    return "checking";
}

export function asTransactionMode(value: unknown): TransactionMode {
    if (value === "single" || value === "installment" || value === "recurring") {
        return value;
    }
    return "single";
}

export function asBeneficiaryType(value: unknown): BeneficiaryType {
    if (value === "person" || value === "cost_center" || value === "pet" || value === "other") {
        return value;
    }
    return "person";
}

export function asCategoryType(value: unknown, fallback: CategoryType): CategoryType {
    if (value === "income" || value === "expense") {
        return value;
    }
    return fallback;
}

export function asInvoiceStatus(value: unknown, fallback: InvoiceStatus = "open"): InvoiceStatus {
    if (value === "open" || value === "paid") {
        return value;
    }
    return fallback;
}

/** Tipo exibido na lista de transações: despesas aparecem como `spending`. */
export function toTransactionType(type: TransactionGroupType): TransactionType {
    if (type === "expense") {
        return "spending";
    }
    return type;
}
