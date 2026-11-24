import { DEFAULT_EXPENSE_CATEGORY_ID, DEFAULT_INCOME_CATEGORY_ID, SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID } from "./domainConstants";
import type { Category, TransactionGroupType } from "./domainTypes";
import { toCategoryTypeFromGroupType } from "./helpers";

/** Categoria usada quando a transação não tem uma válida; a de fatura nunca é escolhida para despesas. */
export function findDefaultCategoryId(groupType: TransactionGroupType, categories: Category[]): string {
    const desiredType = toCategoryTypeFromGroupType(groupType);
    const categoryById = new Map(categories.map((item) => [item.id, item]));
    const selectableCategories = desiredType === "expense" ? categories.filter((item) => item.id !== SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID) : categories;

    if (desiredType === "expense" && categoryById.has(DEFAULT_EXPENSE_CATEGORY_ID)) {
        return DEFAULT_EXPENSE_CATEGORY_ID;
    }

    if (desiredType === "income" && categoryById.has(DEFAULT_INCOME_CATEGORY_ID)) {
        return DEFAULT_INCOME_CATEGORY_ID;
    }

    const firstOfType = selectableCategories.find((item) => item.type === desiredType);
    if (firstOfType) {
        return firstOfType.id;
    }

    const firstCategory = selectableCategories[0] ?? categories[0];
    if (firstCategory) {
        return firstCategory.id;
    }

    return desiredType === "income" ? DEFAULT_INCOME_CATEGORY_ID : DEFAULT_EXPENSE_CATEGORY_ID;
}
