import type { Beneficiary, Category, CategoryType } from "../domainTypes";
import { normalizeBeneficiary, normalizeCategory } from "../entityNormalization/registryNormalizers";
import { normalizeComparisonText } from "../helpers";
import { getDefaultCategoryIconName } from "../../../lib/categoryIcons";

function randomSuffix(): string {
    return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function nextSortOrder(items: Iterable<{ sortOrder: number }>): number {
    return Math.max(0, ...Array.from(items, (item) => item.sortOrder)) + 1;
}

export function isSameBeneficiaryName(left: string, right: string): boolean {
    return normalizeComparisonText(left) === normalizeComparisonText(right);
}

function findCategoryByName(categoriesById: Map<string, Category>, type: CategoryType, name: string, parentId: string | null): Category | null {
    const normalizedName = normalizeComparisonText(name);
    for (const category of categoriesById.values()) {
        if (category.type === type && category.parentId === parentId && normalizeComparisonText(category.name) === normalizedName) {
            return category;
        }
    }
    return null;
}

/** Procura por tipo, pai e nome (sem acento/caixa); cria no fim do grupo de irmãs se não existir. */
export function findOrCreateCategory(params: {
    categoriesById: Map<string, Category>;
    userId: string | null;
    type: CategoryType;
    name: string;
    parentId: string | null;
    now: string;
}): { category: Category; created: boolean } {
    const existing = findCategoryByName(params.categoriesById, params.type, params.name, params.parentId);
    if (existing) {
        return { category: existing, created: false };
    }

    const siblings = Array.from(params.categoriesById.values()).filter((item) => item.type === params.type && item.parentId === params.parentId);
    const created = normalizeCategory({
        id: `category-${params.type}-${randomSuffix()}`,
        userId: params.userId,
        parentId: params.parentId,
        name: params.name,
        type: params.type,
        icon: getDefaultCategoryIconName(params.type),
        color: null,
        isActive: true,
        isSystem: false,
        sortOrder: nextSortOrder(siblings),
        createdAt: params.now,
    });

    params.categoriesById.set(created.id, created);
    return { category: created, created: true };
}

export function findOrCreateBeneficiary(
    beneficiariesById: Map<string, Beneficiary>,
    name: string,
    userId: string | null,
    now: string,
): { beneficiary: Beneficiary; created: boolean } {
    for (const item of beneficiariesById.values()) {
        if (isSameBeneficiaryName(item.name, name)) {
            return { beneficiary: item, created: false };
        }
    }

    const created = normalizeBeneficiary({
        id: `beneficiary-${randomSuffix()}`,
        userId,
        name,
        type: "person",
        avatarColor: null,
        avatarImage: null,
        isActive: true,
        sortOrder: nextSortOrder(beneficiariesById.values()),
        createdAt: now,
    });

    beneficiariesById.set(created.id, created);
    return { beneficiary: created, created: true };
}

export function nextBeneficiarySortOrder(beneficiariesById: Map<string, Beneficiary>): number {
    return nextSortOrder(beneficiariesById.values());
}
