import type { FinanceSnapshot, StoredTransaction, TransactionGroup, Wallet } from "./domainTypes";
import { isInvoicePaymentTransaction } from "./invoicePaymentNote";
import { resolveTransactionCreditCardId, resolveTransactionSourceWalletId } from "./transactionResolution";
import { roundToCents } from "../../lib/primitives";

function shouldIncludeWalletInMainTotals(walletById: Map<string, Wallet>, walletId: string | null | undefined): boolean {
    if (!walletId) {
        return true;
    }

    return walletById.get(walletId)?.includeInMainTotals ?? true;
}

/**
 * Receitas e despesas que movimentam caixa. Compras no cartão entram via pagamento da fatura,
 * por isso ficam fora; carteiras fora dos totais principais também.
 */
export function calculateFinanceSummary(wallets: Wallet[], transactionGroups: TransactionGroup[], transactions: StoredTransaction[]): Pick<FinanceSnapshot, "despesas" | "receitas"> {
    const walletById = new Map(wallets.map((wallet) => [wallet.id, wallet]));
    const groupById = new Map(transactionGroups?.map((group) => [group.id, group]));

    const totals = transactions.reduce(
        (acc, transaction) => {
            if (transaction.status === "cancelled" || transaction.status === "skipped") {
                return acc;
            }

            const group = groupById.get(transaction.groupId);
            if (!group) {
                if (!transaction.invoiceId) {
                    acc.despesas += Math.abs(transaction.amount);
                }
                return acc;
            }

            const sourceWalletId = resolveTransactionSourceWalletId(transaction, group);
            if (!shouldIncludeWalletInMainTotals(walletById, sourceWalletId)) {
                return acc;
            }
            if (isInvoicePaymentTransaction(transaction) && !sourceWalletId) {
                return acc;
            }

            if (group.type === "income") {
                acc.receitas += Math.abs(transaction.amount);
            } else if (group.type === "expense" && !resolveTransactionCreditCardId(transaction, group) && !transaction.invoiceId) {
                acc.despesas += Math.abs(transaction.amount);
            }

            return acc;
        },
        { despesas: 0, receitas: 0 },
    );

    return {
        despesas: roundToCents(totals.despesas),
        receitas: roundToCents(totals.receitas),
    };
}
