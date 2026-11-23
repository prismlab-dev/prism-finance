import { useFinanceCreditCardInvoices, useFinanceStoredTransactions, useFinanceTransactionGroups, type TransactionSeriesScope } from "../../context/FinanceContext";
import { removedInstallmentsTotal } from "../../context/finance/removedInstallments";
import { editedInstallmentTotal } from "../../context/finance/transactionSeries/installmentScope";
import { extractCurrencyDigits, parseCurrencyDigitsToNumber } from "../../lib/currencyMask";
import { formatCurrencyBRL } from "./transactionView";

interface InstallmentAmountHintProps {
    transactionId: string;
    amountInput: string;
    scope: TransactionSeriesScope;
}

/** Na criação o campo é o total da compra; na edição, o valor da parcela. */
export function InstallmentAmountHint({ transactionId, amountInput, scope }: InstallmentAmountHintProps) {
    const transactions = useFinanceStoredTransactions();
    const invoices = useFinanceCreditCardInvoices();
    const groups = useFinanceTransactionGroups();
    const selected = transactions.find((item) => item.id === transactionId);
    if (!selected) return null;
    const amount = parseCurrencyDigitsToNumber(extractCurrencyDigits(amountInput));
    const removedTotal = removedInstallmentsTotal(groups.find((item) => item.id === selected.groupId));
    const current = editedInstallmentTotal(transactions, selected, scope, selected.amount, invoices) + removedTotal;
    const next = editedInstallmentTotal(transactions, selected, scope, amount, invoices) + removedTotal;

    return (
        <p className="-mt-1 pl-1 text-xs leading-relaxed text-white/55" aria-live="polite">
            {scope === "single" ? "Valor desta parcela." : "Valor de cada parcela, não o total da compra."}{" "}
            {amount > 0 && next !== current ? (
                <span className="text-amber-200">O total passa de R$ {formatCurrencyBRL(current)} para R$ {formatCurrencyBRL(next)}.</span>
            ) : (
                <span>Total: R$ {formatCurrencyBRL(current)}.</span>
            )}
        </p>
    );
}
