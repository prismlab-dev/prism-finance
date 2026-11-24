import { SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID } from "../domainConstants";
import type { Category } from "../domainTypes";
import { collectCategoryDescendantIds } from "../permanentDeletion";
import { compareBySortOrderNameAndId, compareCategoriesByTypeParentSort } from "../registryOrdering";

interface Identified {
    id: string;
}

interface Activatable extends Identified {
    isActive: boolean;
}

interface Sortable extends Identified {
    sortOrder: number;
    name: string;
}

/** Substitui o item de mesmo id ou o adiciona (no fim ou no início). */
export function upsertById<T extends Identified>(items: T[], item: T, position: "append" | "prepend" = "append"): T[] {
    if (items.some((existing) => existing.id === item.id)) {
        return items.map((existing) => (existing.id === item.id ? item : existing));
    }
    return position === "append" ? [...items, item] : [item, ...items];
}

/** Liga/desliga um item; `changed: false` quando ele não existe ou já está no estado pedido. */
export function setActiveById<T extends Activatable>(items: T[], id: string, isActive: boolean): { items: T[]; changed: boolean } {
    let changed = false;
    const nextItems = items.map((item) => {
        if (item.id !== id || item.isActive === isActive) {
            return item;
        }
        changed = true;
        return { ...item, isActive };
    });
    return { items: nextItems, changed };
}

function uniqueKnownIds(ids: string[], knownIds: Set<string>): string[] {
    return Array.from(new Set(ids)).filter((id) => knownIds.has(id));
}

/**
 * Coloca os ids pedidos primeiro (na ordem dada), mantém os omitidos na ordem atual
 * e renumera `sortOrder`. Devolve `null` quando nenhum id pedido existe.
 */
export function reorderByIds<T extends Sortable>(items: T[], ids: string[]): { items: T[]; orderedIds: string[] } | null {
    const requestedIds = uniqueKnownIds(ids, new Set(items.map((item) => item.id)));
    if (requestedIds.length < 1) {
        return null;
    }

    const requested = new Set(requestedIds);
    const omittedIds = [...items].sort(compareBySortOrderNameAndId).map((item) => item.id).filter((id) => !requested.has(id));
    const orderedIds = [...requestedIds, ...omittedIds];
    const itemById = new Map(items.map((item) => [item.id, item]));
    const reordered = orderedIds.map((id, index) => ({ ...(itemById.get(id) as T), sortOrder: index }));

    return { items: reordered, orderedIds };
}

/** Reordena só as irmãs (mesmo tipo e pai) da primeira categoria pedida. */
export function reorderCategorySiblings(categories: Category[], ids: string[]): Category[] | null {
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const requestedIds = uniqueKnownIds(ids, new Set(categoryById.keys()));
    const anchor = requestedIds.length > 0 ? categoryById.get(requestedIds[0]) : null;
    if (!anchor) {
        return null;
    }

    const siblings = categories.filter((item) => item.type === anchor.type && item.parentId === anchor.parentId);
    const reordered = reorderByIds(siblings, requestedIds);
    if (!reordered) {
        return null;
    }

    const reorderedById = new Map(reordered.items.map((category) => [category.id, category]));
    return categories.map((category) => reorderedById.get(category.id) ?? category).sort(compareCategoriesByTypeParentSort);
}

/**
 * Liga/desliga a categoria e todas as descendentes. A categoria de fatura de cartão nunca
 * é desativada. Devolve `null` quando nada muda.
 */
export function setCategoryTreeActive(categories: Category[], categoryId: string, isActive: boolean): Category[] | null {
    if (!categories.some((category) => category.id === categoryId) || (categoryId === SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID && !isActive)) {
        return null;
    }

    const affectedIds = collectCategoryDescendantIds(categories, categoryId);
    affectedIds.add(categoryId);

    let changed = false;
    const nextCategories = categories.map((category) => {
        if (!affectedIds.has(category.id)) {
            return category;
        }
        if (category.id === SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID && !isActive) {
            return { ...category, isActive: true };
        }
        if (category.isActive === isActive) {
            return category;
        }
        changed = true;
        return { ...category, isActive };
    });

    return changed ? nextCategories.sort(compareCategoriesByTypeParentSort) : null;
}
