import { DEFAULT_BENEFICIARY_NAME } from "../domainConstants";
import type { Beneficiary, FinanceSnapshot } from "../domainTypes";
import { createFinanceSnapshot } from "../financeSnapshot";
import { normalizePlanningState } from "../planningState";
import { compareBySortOrderNameAndId, compareCategoriesByTypeParentSort } from "../registryOrdering";
import { syncCreditCardInvoices } from "../syncCreditCardInvoices";
import { asNullableString, getNowIso } from "../valueNormalization";
import { ensureDefaultBeneficiary } from "./defaultBeneficiary";
import { resolveGroupEntityLinks } from "./groupEntityLinks";
import { normalizeRawLedgerEntries, reconcileTransactionLedger } from "./ledgerRepair";
import { mergeSharedBeneficiaries, normalizeRawBeneficiaries, normalizeRawCategories, normalizeRawTags, normalizeRawWishItems } from "./registrySections";
import { ensureSeedCategories } from "./seedCategories";
import { normalizeRawTransactionGroups, normalizeRawTransactions } from "./transactionSections";
import { normalizeTransactionTagLinks } from "./transactionTagLinks";
import { normalizeFavoriteCreditCardId, normalizeRawCreditCardInvoices, normalizeRawCreditCards, normalizeRawWallets } from "./walletSections";
import { getLocalTodayDate } from "../../../lib/localDate";
import { isRecord } from "../../../lib/primitives";

export interface NormalizeFinanceOptions {
    defaultBeneficiaryName?: string;
    defaultBeneficiaryAvatarImage?: string | null;
    sharedBeneficiaries?: Beneficiary[];
}

export interface NormalizeFinanceResult {
    snapshot: FinanceSnapshot;
    /** O dado bruto precisou de reparo/migração e deve ser regravado. */
    changed: boolean;
}

/**
 * Converte dados brutos (servidor, backup local ou formato legado) em um snapshot coerente:
 * descarta registros inválidos, migra formatos antigos, garante entidades padrão,
 * religa grupos a categorias/beneficiários e reconstrói ledger e faturas.
 */
export function normalizeFinanceSnapshot(rawFinance: unknown, userId: string | null = null, options: NormalizeFinanceOptions = {}): NormalizeFinanceResult {
    const clock = { now: getNowIso(), today: getLocalTodayDate() };
    const { now } = clock;
    const record = isRecord(rawFinance) ? rawFinance : {};
    let changed = !isRecord(rawFinance);
    // As etapas mutam os mapas recebidos: sempre execute antes de acumular `changed` (nunca `changed ||= etapa()`).
    const track = <T extends { changed: boolean }>(result: T): T => {
        changed = changed || result.changed;
        return result;
    };
    const trackMutation = (stepChanged: boolean): void => {
        changed = changed || stepChanged;
    };

    const { wallets } = track(normalizeRawWallets(record.wallets, clock));
    const walletIds = new Set(wallets.map((wallet) => wallet.id));

    const { creditCards } = track(normalizeRawCreditCards(record.creditCards, walletIds, clock));
    const creditCardIds = new Set(creditCards.map((card) => card.id));
    const { favoriteCreditCardId } = track(normalizeFavoriteCreditCardId(record.favoriteCreditCardId, creditCards));
    const { invoices } = track(normalizeRawCreditCardInvoices(record.creditCardInvoices, creditCardIds, clock));

    const { byId: categoriesById } = track(normalizeRawCategories(record.categories, { userId, now }));
    trackMutation(ensureSeedCategories(categoriesById, now));

    const { byId: beneficiariesById } = track(normalizeRawBeneficiaries(record.beneficiaries, { userId, now }));
    mergeSharedBeneficiaries(beneficiariesById, Array.isArray(options.sharedBeneficiaries) ? options.sharedBeneficiaries : []);
    trackMutation(
        ensureDefaultBeneficiary(beneficiariesById, {
            userId,
            now,
            name: options.defaultBeneficiaryName?.trim() || DEFAULT_BENEFICIARY_NAME,
            avatarImage: asNullableString(options.defaultBeneficiaryAvatarImage, null),
        }),
    );

    const { byId: tagsById } = track(normalizeRawTags(record.tags, { userId, now }));
    const { byId: wishItemsById } = track(normalizeRawWishItems(record.wishItems, { userId, now }));

    const transactionContext = { ...clock, userId, walletIds };
    const { byId: groupsById } = track(normalizeRawTransactionGroups(record.transactionGroups, creditCardIds, transactionContext));
    const { transactions, legacyLedgerEntries } = track(normalizeRawTransactions(record.transactions, groupsById, transactionContext));
    trackMutation(resolveGroupEntityLinks(groupsById, { categoriesById, beneficiariesById, userId, now }));

    const { ledgerEntries: storedLedgerEntries } = track(normalizeRawLedgerEntries(record.ledgerEntries, walletIds, now));
    const { ledgerEntries } = track(reconcileTransactionLedger({ ledgerEntries: [...storedLedgerEntries, ...legacyLedgerEntries], transactions, groupsById }));

    const transactionGroups = Array.from(groupsById.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const invoiceProjection = track(
        syncCreditCardInvoices({
            creditCards,
            transactionGroups,
            transactions: [...transactions].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
            existingInvoices: invoices,
        }),
    );

    const transactionIds = new Set(invoiceProjection.transactions.map((item) => item.id));
    const { links: transactionTags } = track(normalizeTransactionTagLinks(record.transactionTags, transactionIds, new Set(tagsById.keys())));

    return {
        snapshot: createFinanceSnapshot(
            wallets,
            creditCards,
            invoiceProjection.creditCardInvoices,
            favoriteCreditCardId,
            transactionGroups,
            invoiceProjection.transactions,
            ledgerEntries,
            Array.from(beneficiariesById.values()).sort(compareBySortOrderNameAndId),
            Array.from(categoriesById.values()).sort(compareCategoriesByTypeParentSort),
            Array.from(tagsById.values()).sort(compareBySortOrderNameAndId),
            Array.from(wishItemsById.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)),
            transactionTags,
            normalizePlanningState(record.planning),
        ),
        changed,
    };
}
