import { DEFAULT_BENEFICIARY_NAME } from "../domainConstants";
import type { Beneficiary, Category, TransactionGroup } from "../domainTypes";
import { findDefaultCategoryId } from "../categoryDefaults";
import { toCategoryTypeFromGroupType } from "../helpers";
import { findOrCreateBeneficiary, findOrCreateCategory } from "./entityLookup";

interface EntityLinkContext {
    categoriesById: Map<string, Category>;
    beneficiariesById: Map<string, Beneficiary>;
    userId: string | null;
    now: string;
}

function categoryLabels(category: Category, categoriesById: Map<string, Category>): { categoryName: string; subcategoryName: string | null } {
    const parent = category.parentId ? categoriesById.get(category.parentId) : null;
    return { categoryName: parent?.name ?? category.name, subcategoryName: parent ? category.name : null };
}

/** Grupo sem categoria válida: recria categoria/subcategoria a partir dos nomes guardados no grupo. */
function recreateCategoryFromNames(group: TransactionGroup, context: EntityLinkContext): void {
    const type = toCategoryTypeFromGroupType(group.type);
    const userId = group.userId ?? context.userId;
    const root = findOrCreateCategory({ categoriesById: context.categoriesById, userId, type, name: group.categoryName || "Sem categoria", parentId: null, now: context.now });
    const finalCategory = group.subcategoryName
        ? findOrCreateCategory({ categoriesById: context.categoriesById, userId, type, name: group.subcategoryName, parentId: root.category.id, now: context.now }).category
        : root.category;

    group.categoryId = finalCategory.id;
    Object.assign(group, categoryLabels(finalCategory, context.categoriesById));
}

function syncCategory(group: TransactionGroup, context: EntityLinkContext): boolean {
    let changed = false;
    if (!group.categoryId || !context.categoriesById.has(group.categoryId)) {
        recreateCategoryFromNames(group, context);
        changed = true;
    }

    const category = group.categoryId ? context.categoriesById.get(group.categoryId) : null;
    if (!category) {
        const fallbackCategory = context.categoriesById.get(findDefaultCategoryId(group.type, Array.from(context.categoriesById.values())));
        if (fallbackCategory) {
            group.categoryId = fallbackCategory.id;
            group.categoryName = fallbackCategory.name;
            group.subcategoryName = null;
            changed = true;
        }
        return changed;
    }

    const expected = categoryLabels(category, context.categoriesById);
    if (group.categoryName !== expected.categoryName || group.subcategoryName !== expected.subcategoryName) {
        Object.assign(group, expected);
        changed = true;
    }
    return changed;
}

function syncBeneficiary(group: TransactionGroup, context: EntityLinkContext): boolean {
    const beneficiary = group.beneficiaryId ? context.beneficiariesById.get(group.beneficiaryId) : null;
    if (!beneficiary) {
        const result = findOrCreateBeneficiary(context.beneficiariesById, group.beneficiaryName || DEFAULT_BENEFICIARY_NAME, group.userId ?? context.userId, context.now);
        group.beneficiaryId = result.beneficiary.id;
        group.beneficiaryName = result.beneficiary.name;
        return true;
    }

    if (group.beneficiaryName !== beneficiary.name) {
        group.beneficiaryName = beneficiary.name;
        return true;
    }
    return false;
}

/**
 * Liga cada grupo a categoria e beneficiário existentes (criando-os a partir dos nomes
 * desnormalizados quando preciso) e atualiza esses nomes a partir das entidades.
 */
export function resolveGroupEntityLinks(groupsById: Map<string, TransactionGroup>, context: EntityLinkContext): boolean {
    let changed = false;

    for (const [groupId, rawGroup] of groupsById.entries()) {
        const group = { ...rawGroup };
        const categoryChanged = syncCategory(group, context);
        const beneficiaryChanged = syncBeneficiary(group, context);
        changed ||= categoryChanged || beneficiaryChanged;
        groupsById.set(groupId, group);
    }

    return changed;
}
