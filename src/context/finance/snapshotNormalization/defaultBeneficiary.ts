import { DEFAULT_BENEFICIARY_ID, DEFAULT_BENEFICIARY_NAME } from "../domainConstants";
import type { Beneficiary } from "../domainTypes";
import { normalizeBeneficiary } from "../entityNormalization/registryNormalizers";
import { isSameBeneficiaryName, nextBeneficiarySortOrder } from "./entityLookup";

const DEFAULT_AVATAR_COLOR = "#4B5563";

function hasSelfProfileChanged(before: Beneficiary, after: Beneficiary): boolean {
    return (
        before.name !== after.name ||
        before.avatarImage !== after.avatarImage ||
        before.userId !== after.userId ||
        before.familyId !== after.familyId ||
        before.source !== after.source ||
        before.isSelfProfile !== after.isSelfProfile ||
        before.isActive !== after.isActive
    );
}

/**
 * Garante o beneficiário que representa o próprio usuário, sincronizado com o perfil.
 * Reaproveita o registro de id padrão ou, em dados antigos, o chamado "Eu".
 */
export function ensureDefaultBeneficiary(
    beneficiariesById: Map<string, Beneficiary>,
    params: { userId: string | null; now: string; name: string; avatarImage: string | null },
): boolean {
    const existing =
        beneficiariesById.get(DEFAULT_BENEFICIARY_ID) ??
        Array.from(beneficiariesById.values()).find((item) => isSameBeneficiaryName(item.name, DEFAULT_BENEFICIARY_NAME));

    if (existing) {
        const selfProfile = normalizeBeneficiary({
            ...existing,
            userId: params.userId,
            familyId: null,
            source: "personal",
            isSelfProfile: true,
            name: params.name,
            type: "person",
            avatarImage: params.avatarImage,
            avatarColor: existing.avatarColor ?? DEFAULT_AVATAR_COLOR,
            isActive: true,
        });
        beneficiariesById.set(existing.id, selfProfile);
        return hasSelfProfileChanged(existing, selfProfile);
    }

    beneficiariesById.set(
        DEFAULT_BENEFICIARY_ID,
        normalizeBeneficiary({
            id: DEFAULT_BENEFICIARY_ID,
            userId: params.userId,
            familyId: null,
            source: "personal",
            isSelfProfile: true,
            name: params.name,
            type: "person",
            avatarColor: DEFAULT_AVATAR_COLOR,
            avatarImage: params.avatarImage,
            isActive: true,
            sortOrder: nextBeneficiarySortOrder(beneficiariesById),
            createdAt: params.now,
        }),
    );

    return true;
}
