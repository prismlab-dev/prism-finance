import { DEFAULT_BENEFICIARY_NAME, DEFAULT_WALLET_ID } from "./domainConstants";
import type {
    Beneficiary,
    Category,
    ResolvedTransactionCategory,
    StoredTransaction,
    Tag,
    TransactionEntity,
    TransactionGroup,
    TransactionGroupType,
    TransactionListItem,
    TransactionTag,
} from "./domainTypes";
import { toTransactionType } from "./enumNormalization";
import { toCategoryTypeFromGroupType } from "./helpers";
import { parseInvoicePaymentNote } from "./invoicePaymentNote";
import {
    resolveTransactionBeneficiaryId,
    resolveTransactionCategoryId,
    resolveTransactionCreditCardId,
    resolveTransactionDestinationWalletId,
    resolveTransactionSourceWalletId,
    resolveTransactionTitle,
} from "./transactionResolution";
import { normalizeCategoryIconName } from "../../lib/categoryIcons";
import { roundToCents } from "../../lib/primitives";

function groupTagIdsByTransaction(transactionTags: TransactionTag[]): Map<string, string[]> {
    const tagIdsByTransactionId = new Map<string, string[]>();
    transactionTags.forEach((link) => {
        const list = tagIdsByTransactionId.get(link.transactionId);
        if (list) {
            list.push(link.tagId);
        } else {
            tagIdsByTransactionId.set(link.transactionId, [link.tagId]);
        }
    });
    return tagIdsByTransactionId;
}

function resolveCategory(params: {
    category: Category | null | undefined;
    parentCategory: Category | null | undefined;
    group: TransactionGroup | undefined;
    groupType: TransactionGroupType;
}): ResolvedTransactionCategory {
    const { category, parentCategory, group } = params;
    if (category) {
        return {
            id: category.id,
            label: parentCategory ? `${parentCategory.name} / ${category.name}` : category.name,
            parentLabel: parentCategory?.name ?? null,
            icon: normalizeCategoryIconName(category.icon, category.type),
            color: category.color,
            type: category.type,
        };
    }

    // Categoria apagada: usa os nomes desnormalizados guardados no grupo.
    const fallbackPrincipal = group?.categoryName?.trim() || "Sem categoria";
    const fallbackSub = group?.subcategoryName?.trim() || null;
    return {
        id: null,
        label: fallbackSub ? `${fallbackPrincipal} / ${fallbackSub}` : fallbackPrincipal,
        parentLabel: fallbackSub ? fallbackPrincipal : null,
        icon: normalizeCategoryIconName(null, null),
        color: null,
        type: toCategoryTypeFromGroupType(params.groupType),
    };
}

/** Junta transação, grupo e cadastros na forma que a interface consome. */
export function toTransactionList(
    transactions: StoredTransaction[],
    transactionGroups: TransactionGroup[],
    categories: Category[],
    beneficiaries: Beneficiary[],
    tags: Tag[],
    transactionTags: TransactionTag[],
): TransactionListItem[] {
    const groupsById = new Map(transactionGroups?.map((group) => [group.id, group]));
    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const beneficiariesById = new Map(beneficiaries.map((beneficiary) => [beneficiary.id, beneficiary]));
    const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
    const tagIdsByTransactionId = groupTagIdsByTransaction(transactionTags);

    return transactions.map((transaction) => {
        const group = groupsById.get(transaction.groupId);
        const groupType = group?.type ?? "expense";
        const resolvedCategoryId = resolveTransactionCategoryId(transaction, group);
        const resolvedBeneficiaryId = resolveTransactionBeneficiaryId(transaction, group);
        const resolvedCreditCardId = resolveTransactionCreditCardId(transaction, group);
        const sourceWalletId = resolveTransactionSourceWalletId(transaction, group);
        const category = resolvedCategoryId ? categoriesById.get(resolvedCategoryId) : null;
        const parentCategory = category?.parentId ? categoriesById.get(category.parentId) : null;
        const beneficiary = resolvedBeneficiaryId ? beneficiariesById.get(resolvedBeneficiaryId) : null;

        const tagIds = Array.from(new Set(tagIdsByTransactionId.get(transaction.id) ?? [])).filter((tagId) => tagsById.has(tagId));
        const resolvedTags = tagIds.map((tagId) => tagsById.get(tagId)).filter((tag): tag is Tag => Boolean(tag));
        const resolvedCategory = resolveCategory({ category, parentCategory, group, groupType });

        const invoicePaymentMeta = parseInvoicePaymentNote(transaction.notes);
        const paymentForInvoiceId = transaction.paymentForInvoiceId ?? invoicePaymentMeta?.invoiceId ?? null;
        const transactionEntity: TransactionEntity = {
            id: transaction.id,
            groupId: transaction.groupId,
            type: toTransactionType(groupType),
            value: roundToCents(transaction.amount),
            date: transaction.scheduledDate,
            inWallet: sourceWalletId ?? (paymentForInvoiceId ? "" : DEFAULT_WALLET_ID),
            destinationWalletId: resolveTransactionDestinationWalletId(transaction, group) ?? null,
            categoryId: resolvedCategory.id,
            beneficiaryId: resolvedBeneficiaryId,
            tagIds,
            description: resolveTransactionTitle(transaction, group),
            status: transaction.status,
            installmentNumber: transaction.installmentNumber,
            occurrenceNumber: transaction.occurrenceNumber,
            commitment: transaction.commitment,
            isProjected: transaction.isProjected,
            invoiceId: transaction.invoiceId,
            paymentMethod: resolvedCreditCardId ? "credit_card" : "wallet",
            creditCardId: resolvedCreditCardId,
            systemKind: paymentForInvoiceId ? "invoice_payment" : null,
            paymentForInvoiceId,
            isNonCashSettlement: Boolean(paymentForInvoiceId && !sourceWalletId),
            invoicePaymentMeta,
            meta: {
                criado_em: transaction.createdAt,
                atualizado_em: transaction.paidAt,
            },
        };

        return {
            ...transactionEntity,
            category: resolvedCategory,
            beneficiary: beneficiary?.name ?? group?.beneficiaryName ?? DEFAULT_BENEFICIARY_NAME,
            tags: resolvedTags,
        };
    });
}
