import { useCallback, useMemo } from "react";
import { SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID } from "../domainConstants";
import type { Category } from "../domainTypes";
import type { FinanceActionsValue } from "../contextTypes";
import { normalizeCategory } from "../entityNormalization/registryNormalizers";
import { createId } from "../helpers";
import { collectCategoryDescendantIds, findUncategorizedRootCategory, permanentlyDeleteCategoryData } from "../permanentDeletion";
import { compareCategoriesByTypeParentSort, getNextSortOrder } from "../registryOrdering";
import { reorderCategorySiblings, setCategoryTreeActive, upsertById } from "./registryCommands";
import type { FinanceStoreKernel } from "./storeKernel";
import { getDefaultCategoryIconName } from "../../../lib/categoryIcons";

type CategoryActions = Pick<FinanceActionsValue, "addCategory" | "reorderCategories" | "setCategoryActive" | "permanentlyDeleteCategory">;

/**
 * Subcategoria herda o tipo do pai. Mantém a posição ao editar no mesmo grupo de irmãs;
 * ao entrar em outro grupo, vai para o fim dele.
 */
function prepareCategory(categories: Category[], newCategory: Category, userId: string | null): Category {
    const parent = newCategory.parentId ? categories.find((item) => item.id === newCategory.parentId) : null;
    const existing = categories.find((item) => item.id === newCategory.id) ?? null;
    const parentId = parent?.id ?? null;
    const type = parent?.type ?? newCategory.type;
    const keepsSiblingGroup = existing?.parentId === parentId && existing?.type === type;
    const siblings = categories.filter((item) => item.parentId === parentId && item.type === type && item.id !== existing?.id);

    return normalizeCategory({
        ...newCategory,
        userId: newCategory.userId ?? userId,
        parentId,
        type,
        sortOrder: keepsSiblingGroup ? existing?.sortOrder ?? newCategory.sortOrder ?? 0 : getNextSortOrder(siblings),
        createdAt: newCategory.createdAt ?? new Date().toISOString(),
    });
}

export function useCategoryActions({ user, state, persistFinanceFields, persistFullSnapshot }: FinanceStoreKernel): CategoryActions {
    const { snapshotRef, buildSnapshot, commitSnapshot } = state;
    const userId = user?.uid ?? null;

    const commitCategories = useCallback(
        (categories: Category[]) => {
            const snapshot = buildSnapshot({ categories });
            commitSnapshot(snapshot);
            persistFinanceFields({ categories: snapshot.categories });
        },
        [buildSnapshot, commitSnapshot, persistFinanceFields],
    );

    const addCategory = useCallback(
        async (newCategory: Category) => {
            const categories = snapshotRef.current.categories;
            commitCategories(upsertById(categories, prepareCategory(categories, newCategory, userId)).sort(compareCategoriesByTypeParentSort));
        },
        [commitCategories, snapshotRef, userId],
    );

    const reorderCategories = useCallback(
        async (categoryIds: string[]) => {
            const reordered = reorderCategorySiblings(snapshotRef.current.categories, categoryIds);
            if (reordered) {
                commitCategories(reordered);
            }
        },
        [commitCategories, snapshotRef],
    );

    const setCategoryActive = useCallback(
        async (categoryId: string, isActive: boolean) => {
            const nextCategories = setCategoryTreeActive(snapshotRef.current.categories, categoryId, isActive);
            if (nextCategories) {
                commitCategories(nextCategories);
            }
        },
        [commitCategories, snapshotRef],
    );

    /** Só categorias inativas (nunca a de fatura); as referências passam para "Sem categoria" do mesmo tipo. */
    const permanentlyDeleteCategory = useCallback(
        async (categoryId: string) => {
            const current = snapshotRef.current;
            const target = current.categories.find((category) => category.id === categoryId);
            if (!target || target.isActive || categoryId === SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID) {
                return;
            }

            const removedIds = collectCategoryDescendantIds(current.categories, categoryId);
            removedIds.add(categoryId);
            let remaining = current.categories.filter((category) => !removedIds.has(category.id));

            let fallbackCategory = findUncategorizedRootCategory(remaining, target.type);
            if (!fallbackCategory) {
                fallbackCategory = normalizeCategory({
                    id: createId("category"),
                    userId,
                    parentId: null,
                    name: "Sem categoria",
                    type: target.type,
                    icon: getDefaultCategoryIconName(target.type),
                    color: null,
                    isActive: true,
                    isSystem: false,
                    sortOrder: getNextSortOrder(remaining.filter((category) => category.type === target.type && category.parentId === null)),
                    createdAt: new Date().toISOString(),
                });
                remaining = [...remaining, fallbackCategory];
            }

            const deleted = permanentlyDeleteCategoryData({
                categoryId,
                categories: current.categories,
                transactionGroups: current.transactionGroups,
                transactions: current.transactions,
                wishItems: current.wishItems,
                fallbackCategory,
            });
            const snapshot = buildSnapshot({
                categories: remaining.sort(compareCategoriesByTypeParentSort),
                transactionGroups: deleted.transactionGroups,
                transactions: deleted.transactions,
                wishItems: deleted.wishItems,
            });
            persistFullSnapshot(snapshot);
            commitSnapshot(snapshot);
        },
        [buildSnapshot, commitSnapshot, persistFullSnapshot, snapshotRef, userId],
    );

    return useMemo(
        () => ({ addCategory, reorderCategories, setCategoryActive, permanentlyDeleteCategory }),
        [addCategory, permanentlyDeleteCategory, reorderCategories, setCategoryActive],
    );
}
