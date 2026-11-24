import { DEFAULT_WALLET_ID } from "../domainConstants";
import type { CreditCard, CreditCardInvoice, InvoiceStatus, Wallet } from "../domainTypes";
import { DEFAULT_WALLET } from "../defaultState";
import { asInvoiceStatus, asWalletType } from "../enumNormalization";
import { buildDateString, formatYearMonth } from "../invoiceCycles";
import { asBoolean, asDateString, asDateTimeString, asDayOfMonth, asNullableString, asNumber, asString, getNowIso } from "../valueNormalization";
import { DEFAULT_CREDIT_CARD_ICON, DEFAULT_WALLET_COLOR, DEFAULT_WALLET_ICON } from "../../../lib/walletVisual";
import { roundToCents } from "../../../lib/primitives";

const LEGACY_DEFAULT_WALLET_ID = "first_wallet";

export interface WalletInput extends Partial<Wallet> {
    id: string;
    startBalance?: unknown;
}

export interface CreditCardInput extends Partial<CreditCard> {
    id: string;
}

export interface CreditCardInvoiceInput extends Partial<CreditCardInvoice> {
    id: string;
}

export function normalizeWalletId(walletId: string): string {
    if (!walletId || walletId === LEGACY_DEFAULT_WALLET_ID) {
        return DEFAULT_WALLET_ID;
    }
    return walletId;
}

/** Carteira referenciada que não existe mais cai na padrão (ou na primeira disponível). */
export function normalizeOptionalWalletId(walletId: string | null, walletIds: Set<string>): string | null {
    if (!walletId) {
        return null;
    }
    const normalized = normalizeWalletId(walletId);
    if (walletIds.has(normalized)) {
        return normalized;
    }
    return walletIds.has(DEFAULT_WALLET_ID) ? DEFAULT_WALLET_ID : walletIds.values().next().value ?? DEFAULT_WALLET_ID;
}

export function normalizeWallet(wallet: WalletInput): Wallet {
    const id = normalizeWalletId(wallet.id);
    const initialBalance = roundToCents(asNumber(wallet.initialBalance, asNumber(wallet.startBalance, 0)));
    const balance = roundToCents(asNumber(wallet.balance, initialBalance));

    return {
        id,
        name: asString(wallet.name, id === DEFAULT_WALLET_ID ? DEFAULT_WALLET.name : "Carteira"),
        icon: asString(wallet.icon, DEFAULT_WALLET.icon),
        type: asWalletType(wallet.type),
        balance,
        initialBalance,
        currency: asString(wallet.currency, "BRL").toUpperCase(),
        color: asString(wallet.color, DEFAULT_WALLET_COLOR),
        isActive: asBoolean(wallet.isActive, true),
        includeInMainTotals: asBoolean(wallet.includeInMainTotals, true),
        createdAt: asDateTimeString(wallet.createdAt, getNowIso()),
    };
}

export function normalizeCreditCard(card: CreditCardInput, walletIds: Set<string>): CreditCard {
    const normalizedBankWalletId = normalizeOptionalWalletId(asNullableString(card.bankWalletId, null), walletIds);
    const resolvedIcon = asString(card.icon, DEFAULT_CREDIT_CARD_ICON);
    return {
        id: asString(card.id, `credit-card-${Date.now()}`),
        name: asString(card.name, "Cartao"),
        icon: resolvedIcon === DEFAULT_WALLET_ICON ? DEFAULT_CREDIT_CARD_ICON : resolvedIcon,
        color: asString(card.color, DEFAULT_WALLET_COLOR),
        limit: roundToCents(Math.max(0, asNumber(card.limit, 0))),
        closingDay: asDayOfMonth(card.closingDay, 10),
        dueDay: asDayOfMonth(card.dueDay, 15),
        bankWalletId: normalizedBankWalletId,
        isActive: asBoolean(card.isActive, true),
        createdAt: asDateTimeString(card.createdAt, getNowIso()),
    };
}

export function normalizeCreditCardInvoice(invoice: CreditCardInvoiceInput, creditCardIds: Set<string>): CreditCardInvoice {
    const now = getNowIso();
    const creditCardId = asString(invoice.creditCardId, "");
    const cycleKey = asString(invoice.cycleKey, formatYearMonth(new Date().getFullYear(), new Date().getMonth()));
    const totalAmount = roundToCents(Math.max(0, asNumber(invoice.totalAmount, 0)));
    const paidAmount = roundToCents(Math.min(totalAmount, Math.max(0, asNumber(invoice.paidAmount, 0))));
    const inferredStatus: InvoiceStatus = paidAmount >= totalAmount && totalAmount > 0 ? "paid" : "open";
    const status = asInvoiceStatus(invoice.status, inferredStatus);
    const createdAt = asDateTimeString(invoice.createdAt, now);
    const updatedAt = asDateTimeString(invoice.updatedAt, now);

    const cycleMatch = /^(\d{4})-(\d{2})$/.exec(cycleKey);
    const cycleYear = cycleMatch ? Number(cycleMatch[1]) : new Date().getFullYear();
    const cycleMonth = cycleMatch ? Math.max(0, Math.min(11, Number(cycleMatch[2]) - 1)) : new Date().getMonth();

    const closingDate = asDateString(invoice.closingDate, buildDateString(cycleYear, cycleMonth, 10));
    const dueDate = asDateString(invoice.dueDate, buildDateString(cycleYear, cycleMonth, 15));

    return {
        id: asString(invoice.id, `invoice-${Date.now()}`),
        creditCardId: creditCardIds.has(creditCardId) ? creditCardId : "",
        cycleKey,
        closingDate,
        dueDate,
        totalAmount,
        paidAmount,
        status,
        paidAt: status === "paid" ? asDateTimeString(invoice.paidAt, updatedAt) : null,
        createdAt,
        updatedAt,
    };
}
