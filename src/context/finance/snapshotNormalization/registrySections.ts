import { DEFAULT_BENEFICIARY_NAME } from "../domainConstants";
import type { Beneficiary, Category, Tag, WishItem } from "../domainTypes";
import { asBeneficiaryType, asCategoryType } from "../enumNormalization";
import { normalizeBeneficiary, normalizeCategory, normalizeTag, normalizeWishItem } from "../entityNormalization/registryNormalizers";
import { asBoolean, asDateTimeString, asNullableString, asNumber, asString } from "../valueNormalization";
import { normalizeRecordsById, type SectionResult } from "./recordSections";
import { normalizeWishItemPriority } from "../../../lib/wishlistPriority";

interface RegistryContext {
    userId: string | null;
    now: string;
}

function hasFiniteSortOrder(value: unknown): boolean {
    return Number.isFinite(asNumber(value, Number.NaN));
}

/** Registros antigos sem `sortOrder` usam a posição na lista e são regravados. */
function resolveSortOrder(value: unknown, index: number): number {
    return hasFiniteSortOrder(value) ? asNumber(value, index) : index;
}

export function normalizeRawCategories(raw: unknown, { userId, now }: RegistryContext): SectionResult<Category> {
    return normalizeRecordsById(raw, (rawCategory, index) => {
        const rawIcon = asNullableString(rawCategory.icon, null);
        const hasIsActive = typeof rawCategory.isActive === "boolean";
        const category = normalizeCategory({
            id: rawCategory.id,
            userId: asNullableString(rawCategory.userId, userId),
            parentId: asNullableString(rawCategory.parentId, null),
            name: asString(rawCategory.name, "Sem categoria"),
            type: asCategoryType(rawCategory.type, "expense"),
            icon: rawIcon ?? undefined,
            color: asNullableString(rawCategory.color, null),
            isActive: hasIsActive ? (rawCategory.isActive as boolean) : true,
            isSystem: asBoolean(rawCategory.isSystem, false),
            sortOrder: resolveSortOrder(rawCategory.sortOrder, index),
            createdAt: asDateTimeString(rawCategory.createdAt, now),
        });

        return { item: category, changed: rawIcon !== category.icon || !hasFiniteSortOrder(rawCategory.sortOrder) || !hasIsActive };
    });
}

export function normalizeRawBeneficiaries(raw: unknown, { userId, now }: RegistryContext): SectionResult<Beneficiary> {
    return normalizeRecordsById(raw, (rawBeneficiary, index) => {
        const rawAvatarImage = asNullableString(rawBeneficiary.avatarImage, null);
        const beneficiary = normalizeBeneficiary({
            id: rawBeneficiary.id,
            userId: asNullableString(rawBeneficiary.userId, userId),
            familyId: asNullableString(rawBeneficiary.familyId, null),
            source: rawBeneficiary.source === "family_shared" ? "family_shared" : "personal",
            isSelfProfile: asBoolean(rawBeneficiary.isSelfProfile, false),
            name: asString(rawBeneficiary.name, DEFAULT_BENEFICIARY_NAME),
            type: asBeneficiaryType(rawBeneficiary.type),
            avatarColor: asNullableString(rawBeneficiary.avatarColor, null),
            avatarImage: rawAvatarImage,
            isActive: asBoolean(rawBeneficiary.isActive, true),
            sortOrder: resolveSortOrder(rawBeneficiary.sortOrder, index),
            createdAt: asDateTimeString(rawBeneficiary.createdAt, now),
        });

        return { item: beneficiary, changed: rawAvatarImage !== beneficiary.avatarImage || !hasFiniteSortOrder(rawBeneficiary.sortOrder) };
    });
}

/** Beneficiários compartilhados pela família sempre entram ativos e substituem um pessoal de mesmo id. */
export function mergeSharedBeneficiaries(beneficiariesById: Map<string, Beneficiary>, sharedBeneficiaries: Beneficiary[]): void {
    sharedBeneficiaries.forEach((sharedBeneficiary) => {
        const normalized = normalizeBeneficiary({
            ...sharedBeneficiary,
            source: "family_shared",
            isSelfProfile: sharedBeneficiary.isSelfProfile ?? true,
            isActive: true,
        });

        const existing = beneficiariesById.get(normalized.id);
        if (!existing || existing.source !== normalized.source) {
            beneficiariesById.set(normalized.id, normalized);
        }
    });
}

export function normalizeRawTags(raw: unknown, { userId, now }: RegistryContext): SectionResult<Tag> {
    return normalizeRecordsById(raw, (rawTag, index) => {
        const hasIsActive = typeof rawTag.isActive === "boolean";
        const tag = normalizeTag({
            id: rawTag.id,
            userId: asNullableString(rawTag.userId, userId),
            name: asString(rawTag.name, "Tag"),
            color: asNullableString(rawTag.color, null),
            isActive: hasIsActive ? (rawTag.isActive as boolean) : true,
            sortOrder: resolveSortOrder(rawTag.sortOrder, index),
            createdAt: asDateTimeString(rawTag.createdAt, now),
        });

        return { item: tag, changed: !hasFiniteSortOrder(rawTag.sortOrder) || !hasIsActive };
    });
}

export function normalizeRawWishItems(raw: unknown, { userId, now }: RegistryContext): SectionResult<WishItem> {
    return normalizeRecordsById(raw, (rawWishItem) => {
        const wishItem = normalizeWishItem({
            id: rawWishItem.id,
            userId: asNullableString(rawWishItem.userId, userId),
            value: asNumber(rawWishItem.value, 0),
            categoryId: asString(rawWishItem.categoryId, ""),
            priority: normalizeWishItemPriority(rawWishItem.priority),
            description: asString(rawWishItem.description, "Desejo"),
            link: asNullableString(rawWishItem.link, null),
            imageUrl: asNullableString(rawWishItem.imageUrl, null),
            isActive: asBoolean(rawWishItem.isActive, true),
            createdAt: asDateTimeString(rawWishItem.createdAt, now),
        });

        const isValid = Boolean(wishItem.categoryId) && wishItem.value > 0 && Boolean(wishItem.description);
        return { item: isValid ? wishItem : null };
    });
}
