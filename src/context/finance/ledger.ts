import { DEFAULT_WALLET_ID } from "./domainConstants";
import type { LedgerEntry, StoredTransaction, TransactionGroup, Wallet } from "./domainTypes";
import { isInvoicePaymentTransaction } from "./invoicePaymentNote";
import { getTransactionLedgerEntryDateIso } from "./ledgerDates";
import { resolveTransactionCreditCardId, resolveTransactionDestinationWalletId, resolveTransactionSourceWalletId, resolveTransactionTitle } from "./transactionResolution";
import { roundToCents } from "../../lib/primitives";

export { calculateCreditCardInvoiceOpenAmount } from "./invoiceCycles";
export { resolveLedgerEntryDateIso } from "./ledgerDates";

function createLedgerEntryId(transactionId: string, suffix?: string): string {
    return suffix ? `le-${transactionId}-${suffix}` : `le-${transactionId}`;
}

function buildLedgerEntry(transaction: StoredTransaction, params: { walletId: string; amount: number; description: string; suffix?: string }): LedgerEntry {
    return {
        id: createLedgerEntryId(transaction.id, params.suffix),
        walletId: params.walletId,
        transactionId: transaction.id,
        invoiceId: null,
        amount: roundToCents(params.amount),
        balanceAfter: 0,
        description: params.description,
        createdAt: getTransactionLedgerEntryDateIso(transaction),
    };
}

/**
 * Projeção local dos lançamentos de uma transação paga. O PostgreSQL é a fonte de verdade
 * e aplica as mesmas regras; esta cópia só mantém o cache coerente até a revisão confirmada.
 */
export function createLedgerEntriesForPaidTransaction(transaction: StoredTransaction, group: TransactionGroup): LedgerEntry[] {
    if (transaction.status !== "paid") {
        return [];
    }

    const title = resolveTransactionTitle(transaction, group);

    if (group.type === "income") {
        const walletId = resolveTransactionSourceWalletId(transaction, group) ?? DEFAULT_WALLET_ID;
        return [buildLedgerEntry(transaction, { walletId, amount: transaction.amount, description: `Receita: ${title}` })];
    }

    if (group.type === "expense") {
        if (resolveTransactionCreditCardId(transaction, group)) {
            return [];
        }
        const sourceWalletId = resolveTransactionSourceWalletId(transaction, group);
        // A manual invoice close is an explicit settlement without a cash
        // account movement. PostgreSQL applies the same rule and therefore no
        // synthetic default-wallet ledger row may be recreated during hydrate.
        if (isInvoicePaymentTransaction(transaction) && !sourceWalletId) {
            return [];
        }
        const walletId = sourceWalletId ?? DEFAULT_WALLET_ID;
        return [buildLedgerEntry(transaction, { walletId, amount: -Math.abs(transaction.amount), description: `Despesa: ${title}` })];
    }

    const sourceWalletId = resolveTransactionSourceWalletId(transaction, group) ?? DEFAULT_WALLET_ID;
    const destinationWalletId = resolveTransactionDestinationWalletId(transaction, group) ?? null;
    const entries = [
        buildLedgerEntry(transaction, { walletId: sourceWalletId, amount: -Math.abs(transaction.amount), description: `Transferencia enviada: ${title}`, suffix: "source" }),
    ];

    if (destinationWalletId && destinationWalletId !== sourceWalletId) {
        entries.push(
            buildLedgerEntry(transaction, { walletId: destinationWalletId, amount: Math.abs(transaction.amount), description: `Transferencia recebida: ${title}`, suffix: "dest" }),
        );
    }

    return entries;
}

/** Recalcula `balanceAfter` em ordem cronológica e o saldo final de cada carteira. */
export function applyLedgerToWallets(wallets: Wallet[], ledgerEntries: LedgerEntry[]): { wallets: Wallet[]; ledgerEntries: LedgerEntry[] } {
    const balanceByWallet = new Map<string, number>();
    wallets.forEach((wallet) => {
        balanceByWallet.set(wallet.id, roundToCents(wallet.initialBalance));
    });

    const sortedEntries = [...ledgerEntries].sort((a, b) => {
        if (a.createdAt === b.createdAt) {
            return a.id.localeCompare(b.id);
        }
        return a.createdAt.localeCompare(b.createdAt);
    });

    const normalizedLedger = sortedEntries.map((entry) => {
        const roundedAmount = roundToCents(entry.amount);
        const current = balanceByWallet.get(entry.walletId);
        if (current === undefined) {
            return {
                ...entry,
                amount: roundedAmount,
                balanceAfter: roundToCents(entry.balanceAfter),
            };
        }

        const nextBalance = roundToCents(current + roundedAmount);
        balanceByWallet.set(entry.walletId, nextBalance);

        return {
            ...entry,
            amount: roundedAmount,
            balanceAfter: nextBalance,
        };
    });

    const normalizedWallets = wallets.map((wallet) => {
        const balance = balanceByWallet.get(wallet.id);
        return {
            ...wallet,
            balance: balance === undefined ? roundToCents(wallet.initialBalance) : roundToCents(balance),
        };
    });

    return {
        wallets: normalizedWallets,
        ledgerEntries: normalizedLedger,
    };
}

export function calculateTotalBalance(wallets: Wallet[]): number {
    return roundToCents(wallets.reduce((sum, wallet) => sum + (wallet.includeInMainTotals ? wallet.balance : 0), 0));
}
