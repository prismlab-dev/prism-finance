import { DEFAULT_BENEFICIARY_NAME } from "../domainConstants";
import type { Beneficiary, Category, Tag, WishItem } from "../domainTypes";
import { asBeneficiaryType, asCategoryType } from "../enumNormalization";
import { asBoolean, asDateTimeString, asNullableString, asNumber, asSortOrder, asString, getNowIso } from "../valueNormalization";
import { normalizeCategoryIconName } from "../../../lib/categoryIcons";
import { roundToCents } from "../../../lib/primitives";
import { normalizeWishItemPriority } from "../../../lib/wishlistPriority";

export interface BeneficiaryInput extends Partial<Beneficiary> {
    id: string;
}

export interface CategoryInput extends Partial<Category> {
    id: string;
}

export interface TagInput extends Partial<Tag> {
    id: string;
}

export interface WishItemInput extends Partial<WishItem> {
    id: string;
}

export function normalizeBeneficiary(beneficiary: BeneficiaryInput): Beneficiary {
    return {
        id: asString(beneficiary.id, `beneficiary-${Date.now()}`),
        userId: asNullableString(beneficiary.userId, null),
        familyId: asNullableString(beneficiary.familyId, null),
        source: beneficiary.source === "family_shared" ? "family_shared" : "personal",
        isSelfProfile: asBoolean(beneficiary.isSelfProfile, false),
        name: asString(beneficiary.name, DEFAULT_BENEFICIARY_NAME),
        type: asBeneficiaryType(beneficiary.type),
        avatarColor: asNullableString(beneficiary.avatarColor, null),
        avatarImage: asNullableString(beneficiary.avatarImage, null),
        isActive: asBoolean(beneficiary.isActive, true),
        sortOrder: asSortOrder(beneficiary.sortOrder, 0),
        createdAt: asDateTimeString(beneficiary.createdAt, getNowIso()),
    };
}

export function normalizeCategory(category: CategoryInput): Category {
    const resolvedType = asCategoryType(category.type, "expense");
    return {
        id: asString(category.id, `category-${Date.now()}`),
        userId: asNullableString(category.userId, null),
        parentId: asNullableString(category.parentId, null),
        name: asString(category.name, "Sem categoria"),
        type: resolvedType,
        icon: normalizeCategoryIconName(asNullableString(category.icon, null), resolvedType),
        color: asNullableString(category.color, null),
        isActive: asBoolean(category.isActive, true),
        isSystem: asBoolean(category.isSystem, false),
        sortOrder: asSortOrder(category.sortOrder, 0),
        createdAt: asDateTimeString(category.createdAt, getNowIso()),
    };
}

export function normalizeTag(tag: TagInput): Tag {
    return {
        id: asString(tag.id, `tag-${Date.now()}`),
        userId: asNullableString(tag.userId, null),
        name: asString(tag.name, "Tag"),
        color: asNullableString(tag.color, null),
        isActive: asBoolean(tag.isActive, true),
        sortOrder: asSortOrder(tag.sortOrder, 0),
        createdAt: asDateTimeString(tag.createdAt, getNowIso()),
    };
}

export function normalizeWishItem(wishItem: WishItemInput): WishItem {
    return {
        id: asString(wishItem.id, `wish-${Date.now()}`),
        userId: asNullableString(wishItem.userId, null),
        value: roundToCents(Math.max(0, Math.abs(asNumber(wishItem.value, 0)))),
        categoryId: asString(wishItem.categoryId, "").trim(),
        priority: normalizeWishItemPriority(wishItem.priority),
        description: asString(wishItem.description, "Desejo").trim() || "Desejo",
        link: asNullableString(wishItem.link, null)?.trim() || null,
        imageUrl: asNullableString(wishItem.imageUrl, null)?.trim() || null,
        isActive: asBoolean(wishItem.isActive, true),
        createdAt: asDateTimeString(wishItem.createdAt, getNowIso()),
    };
}
