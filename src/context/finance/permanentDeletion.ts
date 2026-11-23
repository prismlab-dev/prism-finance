import { parseInvoicePaymentNote, type Beneficiary, type Category, type CreditCard, type CreditCardInvoice, type LedgerEntry, type StoredTransaction, type Tag, type TransactionGroup, type TransactionTag, type Wallet, type WishItem } from "./financeCore";
import { resolveTransactionCreditCardId, resolveTransactionDestinationWalletId, resolveTransactionSourceWalletId } from "./transactionResolution";
import { excludeRemovedOccurrences } from "./recurrence/excludeRemovedOccurrences";

interface TransactionPruneParams {
    transactionGroups: TransactionGroup[];
    transactions: StoredTransaction[];
    transactionTags: TransactionTag[];
    ledgerEntries: LedgerEntry[];
    shouldRemoveGroup: (group: TransactionGroup) => boolean;
    shouldRemoveTransaction?: (transaction: StoredTransaction) => boolean;
}

interface TransactionPruneResult {
    transactionGroups: TransactionGroup[];
    transactions: StoredTransaction[];
    transactionTags: TransactionTag[];
    ledgerEntries: LedgerEntry[];
}

interface PermanentlyDeleteWalletParams {
    walletId: string;
    wallets: Wallet[];
    creditCards: CreditCard[];
    transactionGroups: TransactionGroup[];
    transactions: StoredTransaction[];
    transactionTags: TransactionTag[];
    ledgerEntries: LedgerEntry[];
}

interface PermanentlyDeleteCreditCardParams {
    creditCardId: string;
    /** Keep the invoice payments that left a wallet, as ordinary expenses. */
    keepPayments?: boolean;
    creditCards: CreditCard[];
    creditCardInvoices: CreditCardInvoice[];
    transactionGroups: TransactionGroup[];
    transactions: StoredTransaction[];
    transactionTags: TransactionTag[];
    ledgerEntries: LedgerEntry[];
}

interface PermanentlyDeleteBeneficiaryParams {
    beneficiaryId: string;
    beneficiaries: Beneficiary[];
    transactionGroups: TransactionGroup[];
    transactions: StoredTransaction[];
    fallbackBeneficiary: Beneficiary;
}

interface PermanentlyDeleteCategoryParams {
    categoryId: string;
    categories: Category[];
    transactionGroups: TransactionGroup[];
    transactions: StoredTransaction[];
    wishItems: WishItem[];
    fallbackCategory: Category;
}

interface PermanentlyDeleteTagParams {
    tagId: string;
    tags: Tag[];
    transactionTags: TransactionTag[];
    transactionGroups: TransactionGroup[];
}

function normalizeComparisonText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim()
        .toLowerCase();
}

function pruneTransactionsAndRelatedData(params: TransactionPruneParams): TransactionPruneResult {
    const targetGroupIds = new Set(params.transactionGroups.filter(params.shouldRemoveGroup).map((group) => group.id));
    const removedTransactionIds = new Set(
        params.transactions
            .filter((transaction) => targetGroupIds.has(transaction.groupId) || params.shouldRemoveTransaction?.(transaction) === true)
            .map((transaction) => transaction.id),
    );

    const nextTransactions = params.transactions.filter((transaction) => !removedTransactionIds.has(transaction.id));
    const nextTransactionGroups = excludeRemovedOccurrences(
        params.transactionGroups.filter((group) => !targetGroupIds.has(group.id)),
        params.transactions.filter((transaction) => removedTransactionIds.has(transaction.id)), params.transactionGroups,
    );

    return {
        transactionGroups: nextTransactionGroups,
        transactions: nextTransactions,
        transactionTags: params.transactionTags.filter((item) => !removedTransactionIds.has(item.transactionId)),
        ledgerEntries: params.ledgerEntries.filter((entry) => !entry.transactionId || !removedTransactionIds.has(entry.transactionId)),
    };
}

export function collectCategoryDescendantIds(categories: Category[], rootId: string): Set<string> {
    const descendants = new Set<string>();
    const queue = [rootId];

    while (queue.length > 0) {
        const currentParentId = queue.shift();
        if (!currentParentId) {
            continue;
        }

        categories.forEach((category) => {
            if (category.parentId === currentParentId && !descendants.has(category.id)) {
                descendants.add(category.id);
                queue.push(category.id);
            }
        });
    }

    return descendants;
}

// Card purchases carry a source wallet with no cash effect, and a paid invoice must stay paid (as a settlement
// without wallet). Both belong to the card and must outlive the wallet.
function detachCardHistoryFromWallet(params: PermanentlyDeleteWalletParams) {
    const groupsById = new Map(params.transactionGroups.map((group) => [group.id, group]));
    const isPaidInvoicePayment = (transaction: StoredTransaction) =>
        transaction.status === "paid" && Boolean(transaction.paymentForInvoiceId || parseInvoicePaymentNote(transaction.notes));
    const paymentGroupIds = new Set(params.transactions.filter(isPaidInvoicePayment).map((transaction) => transaction.groupId));
    return {
        transactionGroups: params.transactionGroups.map((group) => {
            const rule = group.recurrenceRule;
            const isCardGroup = Boolean(group.creditCardId) && rule?.creditCardId !== null;
            if (!isCardGroup && !paymentGroupIds.has(group.id)) {
                return group;
            }

            return {
                ...group,
                sourceWalletId: group.sourceWalletId === params.walletId ? null : group.sourceWalletId,
                recurrenceRule: rule?.sourceWalletId === params.walletId ? { ...rule, sourceWalletId: null } : rule,
            };
        }),
        transactions: params.transactions.map((transaction) =>
            transaction.sourceWalletId === params.walletId &&
            (isPaidInvoicePayment(transaction) || resolveTransactionCreditCardId(transaction, groupsById.get(transaction.groupId)))
                ? { ...transaction, sourceWalletId: null }
                : transaction,
        ),
    };
}

export function permanentlyDeleteWalletData(params: PermanentlyDeleteWalletParams) {
    const detached = detachCardHistoryFromWallet(params);
    const nextWallets = params.wallets.filter((wallet) => wallet.id !== params.walletId);
    const nextCreditCards = params.creditCards.map((card) => (card.bankWalletId === params.walletId ? { ...card, bankWalletId: null } : card));
    const pruned = pruneTransactionsAndRelatedData({
        transactionGroups: detached.transactionGroups,
        transactions: detached.transactions,
        transactionTags: params.transactionTags,
        ledgerEntries: params.ledgerEntries,
        shouldRemoveGroup: (group) => group.sourceWalletId === params.walletId || group.destinationWalletId === params.walletId ||
            group.recurrenceRule?.sourceWalletId === params.walletId || group.recurrenceRule?.destinationWalletId === params.walletId,
        shouldRemoveTransaction: (transaction) =>
            transaction.sourceWalletId === params.walletId || transaction.destinationWalletId === params.walletId,
    });

    return {
        wallets: nextWallets,
        creditCards: nextCreditCards,
        transactionGroups: pruned.transactionGroups,
        transactions: pruned.transactions,
        transactionTags: pruned.transactionTags,
        ledgerEntries: pruned.ledgerEntries.filter((entry) => entry.walletId !== params.walletId),
    };
}

type CardPaymentSource = Pick<PermanentlyDeleteCreditCardParams, "creditCardInvoices" | "transactionGroups" | "transactions">;

function isCardPayment(transaction: StoredTransaction, creditCardId: string, invoiceIds: ReadonlySet<string>): boolean {
    return (Boolean(transaction.paymentForInvoiceId) && invoiceIds.has(transaction.paymentForInvoiceId!)) ||
        parseInvoicePaymentNote(transaction.notes)?.creditCardId === creditCardId;
}

/** Invoice payments of the card that moved money out of a wallet. */
export function listCardWalletPayments(data: CardPaymentSource, creditCardId: string): Array<{ transaction: StoredTransaction; walletId: string }> {
    const groupsById = new Map(data.transactionGroups.map((group) => [group.id, group]));
    const invoiceIds = new Set(data.creditCardInvoices.filter((invoice) => invoice.creditCardId === creditCardId).map((invoice) => invoice.id));
    return data.transactions.flatMap((transaction) => {
        if (transaction.status !== "paid" || !isCardPayment(transaction, creditCardId, invoiceIds)) return [];
        const walletId = resolveTransactionSourceWalletId(transaction, groupsById.get(transaction.groupId));
        return walletId ? [{ transaction, walletId }] : [];
    });
}

// Without the invoice link the payment is an ordinary expense, and neither the client nor Postgres erases it with the card.
function detachWalletPayments<T extends CardPaymentSource>(data: T, creditCardId: string): T {
    const payments = listCardWalletPayments(data, creditCardId).map((item) => item.transaction);
    const paymentIds = new Set(payments.map((transaction) => transaction.id));
    const groupIds = new Set(payments.map((transaction) => transaction.groupId));
    return {
        ...data,
        transactions: data.transactions.map((transaction) => paymentIds.has(transaction.id)
            ? { ...transaction, paymentForInvoiceId: null, notes: parseInvoicePaymentNote(transaction.notes) ? null : transaction.notes } : transaction),
        transactionGroups: data.transactionGroups.map((group) => groupIds.has(group.id) && parseInvoicePaymentNote(group.notes) ? { ...group, notes: null } : group),
    };
}

// Installments moved to another account outlive the card: they leave its group, which Postgres erases by cascade.
function keepInstallmentsOutsideCard(params: PermanentlyDeleteCreditCardParams) {
    const cardName = params.creditCards.find((card) => card.id === params.creditCardId)?.name ?? "";
    const groupIds = new Set(params.transactionGroups.map((group) => group.id));
    const movedTransactions = new Map<string, StoredTransaction>();
    const transactionGroups = params.transactionGroups.flatMap((group): TransactionGroup[] => {
        if (group.transactionMode !== "installment") return [group];
        const items = params.transactions.filter((transaction) => transaction.groupId === group.id);
        const kept = items.filter((transaction) => resolveTransactionCreditCardId(transaction, group) !== params.creditCardId);
        if (kept.length === 0) return [group];
        const removed = items.filter((transaction) => !kept.includes(transaction)).map((transaction) => ({
            number: transaction.installmentNumber, amount: transaction.amount, date: transaction.scheduledDate, cardName,
        }));
        const removedInstallments = [...(group.removedInstallments ?? []), ...removed];
        const nextGroup = removedInstallments.length > 0 ? { ...group, removedInstallments } : group;
        if (group.creditCardId !== params.creditCardId) return [nextGroup];

        // Deterministic, so that two devices deleting the same card produce the same group.
        let id = `${group.id}-${params.creditCardId}`;
        while (groupIds.has(id)) id += "-moved";
        groupIds.add(id);
        kept.forEach((transaction) => movedTransactions.set(transaction.id, {
            ...transaction,
            groupId: id,
            routingOverride: true,
            creditCardId: resolveTransactionCreditCardId(transaction, group),
            sourceWalletId: resolveTransactionSourceWalletId(transaction, group),
            destinationWalletId: resolveTransactionDestinationWalletId(transaction, group),
        }));
        const first = movedTransactions.get(kept[0].id)!;
        return [group, { ...nextGroup, id, creditCardId: first.creditCardId, sourceWalletId: first.sourceWalletId, destinationWalletId: first.destinationWalletId }];
    });
    return { transactionGroups, transactions: params.transactions.map((transaction) => movedTransactions.get(transaction.id) ?? transaction) };
}

export function permanentlyDeleteCreditCardData(params: PermanentlyDeleteCreditCardParams) {
    const separated = keepInstallmentsOutsideCard(params.keepPayments ? detachWalletPayments(params, params.creditCardId) : params);
    const nextCreditCards = params.creditCards.filter((card) => card.id !== params.creditCardId);
    const removedInvoiceIds = new Set(
        params.creditCardInvoices
            .filter((invoice) => invoice.creditCardId === params.creditCardId)
            .map((invoice) => invoice.id),
    );
    const nextCreditCardInvoices = params.creditCardInvoices.filter((invoice) => invoice.creditCardId !== params.creditCardId);
    const pruned = pruneTransactionsAndRelatedData({
        transactionGroups: separated.transactionGroups,
        transactions: separated.transactions,
        transactionTags: params.transactionTags,
        ledgerEntries: params.ledgerEntries,
        shouldRemoveGroup: (group) => group.creditCardId === params.creditCardId || group.recurrenceRule?.creditCardId === params.creditCardId,
        shouldRemoveTransaction: (transaction) =>
            transaction.creditCardId === params.creditCardId ||
            isCardPayment(transaction, params.creditCardId, removedInvoiceIds),
    });

    return {
        creditCards: nextCreditCards,
        creditCardInvoices: nextCreditCardInvoices,
        transactionGroups: pruned.transactionGroups,
        transactions: pruned.transactions,
        transactionTags: pruned.transactionTags,
        ledgerEntries: pruned.ledgerEntries,
    };
}

export function permanentlyDeleteBeneficiaryData(params: PermanentlyDeleteBeneficiaryParams) {
    const nextBeneficiaries = params.beneficiaries.filter((beneficiary) => beneficiary.id !== params.beneficiaryId);
    const nextTransactionGroups = params.transactionGroups.map((group) => {
        if (group.beneficiaryId !== params.beneficiaryId) {
            return group;
        }

        return {
            ...group,
            beneficiaryId: params.fallbackBeneficiary.id,
            beneficiaryName: params.fallbackBeneficiary.name,
        };
    });
    const nextTransactions = params.transactions.map((transaction) =>
        transaction.beneficiaryId === params.beneficiaryId
            ? { ...transaction, beneficiaryId: params.fallbackBeneficiary.id }
            : transaction,
    );

    return {
        beneficiaries: nextBeneficiaries,
        transactionGroups: nextTransactionGroups,
        transactions: nextTransactions,
    };
}

export function permanentlyDeleteCategoryData(params: PermanentlyDeleteCategoryParams) {
    const affectedCategoryIds = collectCategoryDescendantIds(params.categories, params.categoryId);
    affectedCategoryIds.add(params.categoryId);

    const nextCategories = params.categories.filter((category) => !affectedCategoryIds.has(category.id));
    const nextTransactionGroups = params.transactionGroups.map((group) => {
        if (!group.categoryId || !affectedCategoryIds.has(group.categoryId)) {
            return group;
        }

        return {
            ...group,
            categoryId: params.fallbackCategory.id,
            categoryName: params.fallbackCategory.name,
            subcategoryName: null,
        };
    });
    const nextTransactions = params.transactions.map((transaction) =>
        transaction.categoryId && affectedCategoryIds.has(transaction.categoryId)
            ? { ...transaction, categoryId: params.fallbackCategory.id }
            : transaction,
    );
    const nextWishItems = params.wishItems.map((wishItem) =>
        affectedCategoryIds.has(wishItem.categoryId)
            ? { ...wishItem, categoryId: params.fallbackCategory.id }
            : wishItem,
    );

    return {
        categories: nextCategories,
        transactionGroups: nextTransactionGroups,
        transactions: nextTransactions,
        wishItems: nextWishItems,
    };
}

export function findUncategorizedRootCategory(categories: Category[], type: Category["type"]): Category | null {
    const targetName = normalizeComparisonText("Sem categoria");
    return (
        categories.find(
            (category) => category.type === type && category.parentId === null && normalizeComparisonText(category.name) === targetName,
        ) ?? null
    );
}

export function permanentlyDeleteTagData(params: PermanentlyDeleteTagParams) {
    const nextTags = params.tags.filter((tag) => tag.id !== params.tagId);
    const nextTransactionTags = params.transactionTags.filter((item) => item.tagId !== params.tagId);
    const nextTransactionGroups = params.transactionGroups.map((group) => {
        const rule = group.recurrenceRule;
        if (!rule || typeof rule !== "object" || !Array.isArray(rule.tagIds)) {
            return group;
        }

        const nextTagIds = rule.tagIds.filter((value): value is string => typeof value === "string" && value !== params.tagId);
        if (nextTagIds.length === rule.tagIds.length) {
            return group;
        }

        return {
            ...group,
            recurrenceRule: {
                ...rule,
                tagIds: nextTagIds,
            },
        };
    });

    return {
        tags: nextTags,
        transactionTags: nextTransactionTags,
        transactionGroups: nextTransactionGroups,
    };
}
