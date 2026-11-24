import { DEFAULT_WALLET_ID } from "../domainConstants";
import type { CreditCard, CreditCardInvoice, Wallet, WalletType } from "../domainTypes";
import { DEFAULT_WALLET } from "../defaultState";
import { asInvoiceStatus } from "../enumNormalization";
import { normalizeCreditCard, normalizeCreditCardInvoice, normalizeWallet } from "../entityNormalization/walletNormalizers";
import { asBoolean, asDateString, asDateTimeString, asDayOfMonth, asNullableString, asNumber, asString } from "../valueNormalization";
import { normalizeRecordsById } from "./recordSections";
import { DEFAULT_CREDIT_CARD_ICON, DEFAULT_WALLET_COLOR } from "../../../lib/walletVisual";

export interface NormalizationClock {
    now: string;
    today: string;
}

/** Carteiras normalizadas, com a padrão primeiro; usuário sem carteiras recebe a padrão. */
export function normalizeRawWallets(raw: unknown, { now }: NormalizationClock): { wallets: Wallet[]; changed: boolean } {
    const section = normalizeRecordsById(raw, (rawWallet) => ({
        item: normalizeWallet({
            id: rawWallet.id,
            name: asString(rawWallet.name, "Carteira"),
            icon: asString(rawWallet.icon, DEFAULT_WALLET.icon),
            type: rawWallet.type as WalletType | undefined,
            balance: asNumber(rawWallet.balance, asNumber(rawWallet.initialBalance, asNumber(rawWallet.startBalance, 0))),
            initialBalance: asNumber(rawWallet.initialBalance, asNumber(rawWallet.startBalance, 0)),
            currency: asString(rawWallet.currency, "BRL"),
            color: asString(rawWallet.color, DEFAULT_WALLET_COLOR),
            isActive: asBoolean(rawWallet.isActive, true),
            includeInMainTotals: asBoolean(rawWallet.includeInMainTotals, true),
            createdAt: asDateTimeString(rawWallet.createdAt, now),
        }),
        changed: !Object.prototype.hasOwnProperty.call(rawWallet, "includeInMainTotals"),
    }));

    let changed = section.changed;
    if (section.byId.size === 0) {
        section.byId.set(DEFAULT_WALLET_ID, DEFAULT_WALLET);
        changed = true;
    }

    const wallets = Array.from(section.byId.values()).sort((a, b) => {
        if (a.id === DEFAULT_WALLET_ID) {
            return -1;
        }
        if (b.id === DEFAULT_WALLET_ID) {
            return 1;
        }
        return a.createdAt.localeCompare(b.createdAt);
    });

    return { wallets, changed };
}

export function normalizeRawCreditCards(raw: unknown, walletIds: Set<string>, { now }: NormalizationClock): { creditCards: CreditCard[]; changed: boolean } {
    const section = normalizeRecordsById(raw, (rawCard) => ({
        item: normalizeCreditCard(
            {
                id: rawCard.id,
                name: asString(rawCard.name, "Cartao"),
                icon: asString(rawCard.icon, DEFAULT_CREDIT_CARD_ICON),
                color: asString(rawCard.color, DEFAULT_WALLET_COLOR),
                limit: asNumber(rawCard.limit, 0),
                closingDay: asDayOfMonth(rawCard.closingDay, 10),
                dueDay: asDayOfMonth(rawCard.dueDay, 15),
                bankWalletId: asNullableString(rawCard.bankWalletId, null),
                isActive: asBoolean(rawCard.isActive, true),
                createdAt: asDateTimeString(rawCard.createdAt, now),
            },
            walletIds,
        ),
    }));

    return {
        creditCards: Array.from(section.byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        changed: section.changed,
    };
}

/** Favorito salvo se ainda existir; senão o primeiro cartão. */
export function normalizeFavoriteCreditCardId(raw: unknown, creditCards: CreditCard[]): { favoriteCreditCardId: string | null; changed: boolean } {
    const rawFavoriteCreditCardId = asNullableString(raw, null);
    const favoriteCreditCardId =
        rawFavoriteCreditCardId && creditCards.some((card) => card.id === rawFavoriteCreditCardId) ? rawFavoriteCreditCardId : creditCards[0]?.id ?? null;
    return { favoriteCreditCardId, changed: rawFavoriteCreditCardId !== favoriteCreditCardId };
}

/** Faturas de cartões existentes; o total e o status definitivos são recalculados depois a partir das transações. */
export function normalizeRawCreditCardInvoices(raw: unknown, creditCardIds: Set<string>, { now, today }: NormalizationClock): { invoices: CreditCardInvoice[]; changed: boolean } {
    const section = normalizeRecordsById(raw, (rawInvoice) => {
        const invoice = normalizeCreditCardInvoice(
            {
                id: rawInvoice.id,
                creditCardId: asString(rawInvoice.creditCardId, ""),
                cycleKey: asString(rawInvoice.cycleKey, ""),
                closingDate: asDateString(rawInvoice.closingDate, today),
                dueDate: asDateString(rawInvoice.dueDate, today),
                totalAmount: asNumber(rawInvoice.totalAmount, 0),
                paidAmount: asNumber(rawInvoice.paidAmount, 0),
                status: asInvoiceStatus(rawInvoice.status),
                paidAt: asNullableString(rawInvoice.paidAt, null),
                createdAt: asDateTimeString(rawInvoice.createdAt, now),
                updatedAt: asDateTimeString(rawInvoice.updatedAt, now),
            },
            creditCardIds,
        );
        return { item: invoice.creditCardId ? invoice : null };
    });

    return { invoices: Array.from(section.byId.values()), changed: section.changed };
}
