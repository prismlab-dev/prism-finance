import { DEFAULT_WALLET_ID } from "../domainConstants";
import type { CreditCard, Wallet } from "../domainTypes";
import { normalizeWalletId } from "../entityNormalization/walletNormalizers";
import { resolveFallbackWalletId } from "../helpers";

/** A carteira favorita precisa existir e estar ativa; senão cai na carteira de fallback. */
export function resolveFavoriteWalletId(candidate: unknown, wallets: Wallet[]): string {
    const normalizedCandidate = typeof candidate === "string" ? normalizeWalletId(candidate.trim()) : DEFAULT_WALLET_ID;
    if (wallets.some((wallet) => wallet.id === normalizedCandidate && wallet.isActive)) {
        return normalizedCandidate;
    }

    return resolveFallbackWalletId(wallets);
}

/** O cartão favorito precisa existir e estar ativo; senão o primeiro ativo (ou o primeiro). */
export function resolveFavoriteCreditCardId(candidate: unknown, creditCards: CreditCard[]): string | null {
    const normalizedCandidate = typeof candidate === "string" ? candidate.trim() : "";
    if (normalizedCandidate && creditCards.some((card) => card.id === normalizedCandidate && card.isActive)) {
        return normalizedCandidate;
    }

    return creditCards.find((card) => card.isActive)?.id ?? creditCards[0]?.id ?? null;
}

export function compareCreditCardsByCreatedAt(a: CreditCard, b: CreditCard): number {
    if (a.createdAt === b.createdAt) {
        return a.id.localeCompare(b.id);
    }
    return a.createdAt.localeCompare(b.createdAt);
}
