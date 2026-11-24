import { DEFAULT_EXPENSE_CATEGORY_ID, DEFAULT_INCOME_CATEGORY_ID, SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID } from "../domainConstants";
import type { Category, CategoryType } from "../domainTypes";
import { normalizeCategory } from "../entityNormalization/registryNormalizers";

interface SystemCategorySeed {
    id: string;
    parentId: string | null;
    name: string;
    type: CategoryType;
    icon: string;
    color: string | null;
}

const SYSTEM_CATEGORY_SEED: SystemCategorySeed[] = [
    { id: "system-category-expense-food", parentId: null, name: "Alimentação", type: "expense", icon: "utensils", color: "#EF4444" },
    { id: "system-category-expense-housing", parentId: null, name: "Moradia", type: "expense", icon: "house", color: "#F59E0B" },
    { id: "system-category-expense-transport", parentId: null, name: "Transporte", type: "expense", icon: "car", color: "#3B82F6" },
    { id: "system-category-expense-health", parentId: null, name: "Saúde", type: "expense", icon: "heart", color: "#10B981" },
    { id: "system-category-expense-leisure", parentId: null, name: "Lazer", type: "expense", icon: "music", color: "#8B5CF6" },
    { id: SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID, parentId: null, name: "Fatura do Cartão", type: "expense", icon: "credit-card", color: "#06B6D4" },
    { id: DEFAULT_EXPENSE_CATEGORY_ID, parentId: null, name: "Sem categoria", type: "expense", icon: "tag", color: "#6B7280" },
    { id: "system-category-expense-food-restaurants", parentId: "system-category-expense-food", name: "Restaurantes", type: "expense", icon: "utensils-crossed", color: "#FB7185" },
    { id: "system-category-expense-food-market", parentId: "system-category-expense-food", name: "Supermercado", type: "expense", icon: "shopping-cart", color: "#F97316" },
    { id: "system-category-expense-food-delivery", parentId: "system-category-expense-food", name: "Delivery", type: "expense", icon: "bike", color: "#22C55E" },
    { id: "system-category-income-salary", parentId: null, name: "Salário", type: "income", icon: "briefcase", color: "#0EA5E9" },
    { id: "system-category-income-investments", parentId: null, name: "Investimentos", type: "income", icon: "chart-line", color: "#14B8A6" },
    { id: DEFAULT_INCOME_CATEGORY_ID, parentId: null, name: "Outras receitas", type: "income", icon: "coins", color: "#22C55E" },
];

const INVOICE_PAYMENT_CATEGORY_SEED = SYSTEM_CATEGORY_SEED.find((item) => item.id === SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID) as SystemCategorySeed;

function buildSeedCategory(seed: SystemCategorySeed, sortOrder: number, now: string): Category {
    return normalizeCategory({ ...seed, userId: null, isActive: true, isSystem: false, sortOrder, createdAt: now });
}

/**
 * Usuário sem categorias recebe as sementes. Categorias semente ficam editáveis (`isSystem: false`),
 * e a categoria de fatura é garantida como raiz de despesa ativa.
 */
export function ensureSeedCategories(categoriesById: Map<string, Category>, now: string): boolean {
    if (categoriesById.size === 0) {
        SYSTEM_CATEGORY_SEED.forEach((seed, index) => {
            const category = buildSeedCategory(seed, index, now);
            categoriesById.set(category.id, category);
        });
        return true;
    }

    let changed = false;
    categoriesById.forEach((category) => {
        if (!category.isSystem) {
            return;
        }
        categoriesById.set(category.id, { ...category, isSystem: false });
        changed = true;
    });

    const invoicePaymentCategory = categoriesById.get(SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID);
    if (!invoicePaymentCategory) {
        categoriesById.set(SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID, buildSeedCategory(INVOICE_PAYMENT_CATEGORY_SEED, 0, now));
        return true;
    }

    const needsInvoiceRepair =
        invoicePaymentCategory.type !== "expense" || invoicePaymentCategory.parentId !== null || !invoicePaymentCategory.isActive || invoicePaymentCategory.isSystem;

    if (needsInvoiceRepair) {
        categoriesById.set(SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID, {
            ...invoicePaymentCategory,
            type: "expense",
            parentId: null,
            isActive: true,
            isSystem: false,
        });
        changed = true;
    }

    return changed;
}
