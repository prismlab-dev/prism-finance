// Barrel de compatibilidade: a lógica de domínio vive nos módulos abaixo, cada um com uma
// responsabilidade. Código novo deve importar do módulo específico (ou de `./index`).
export type * from "./domainTypes";
export * from "./domainConstants";
export { DEFAULT_PLANNING_STATE, DEFAULT_WALLET } from "./defaultState";
export { buildInvoicePaymentNote, parseInvoicePaymentNote } from "./invoicePaymentNote";
export {
    resolveTransactionBeneficiaryId,
    resolveTransactionCategoryId,
    resolveTransactionCreditCardId,
    resolveTransactionDestinationWalletId,
    resolveTransactionSourceWalletId,
    resolveTransactionTitle,
} from "./transactionResolution";
export {
    buildCreditCardInvoiceId,
    calculateCreditCardInvoiceOpenAmount,
    getCreditCardInvoiceMonthKey,
    getMonthKeyFromDateValue,
    parseCreditCardInvoiceId,
    resolveCreditCardInvoiceCycle,
    resolveCreditCardInvoiceCycleFromCycleKey,
    resolveCreditCardInvoiceStatus,
    resolveExpectedCreditCardInvoiceId,
    resolveOpenCreditCardInvoiceCycle,
} from "./invoiceCycles";
export { normalizeCreditCard, normalizeCreditCardInvoice, normalizeWallet, normalizeWalletId } from "./entityNormalization/walletNormalizers";
export { normalizeBeneficiary, normalizeCategory, normalizeTag, normalizeWishItem } from "./entityNormalization/registryNormalizers";
export { normalizeLedgerEntry, normalizeStoredTransaction, normalizeTransactionGroup, normalizeTransactionStatus } from "./entityNormalization/transactionNormalizers";
export { findDefaultCategoryId } from "./categoryDefaults";
export { findCreditCardInvoiceAssignmentIssues, type CreditCardInvoiceAssignmentIssue } from "./invoiceAssignmentIssues";
export { normalizeInvoiceMonthOverrides, normalizePlanningState } from "./planningState";
export { applyLedgerToWallets, calculateTotalBalance, createLedgerEntriesForPaidTransaction, resolveLedgerEntryDateIso } from "./ledger";
export { calculateFinanceSummary } from "./financeSummary";
export { toTransactionList } from "./transactionList";
export { createFinanceSnapshot } from "./financeSnapshot";
export { normalizeFinanceSnapshot } from "./snapshotNormalization/normalizeFinanceSnapshot";
