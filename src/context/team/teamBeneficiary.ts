import type { Beneficiary } from "../finance/domainTypes";
import { normalizeComparisonText } from "../finance/helpers";
import type { TeamSummary } from "../teamTypes";

export function teamBeneficiaryId(teamId: string): string {
    return `team-beneficiary-${teamId}`;
}

/** O beneficiário da equipe no livro pessoal: pelo id fixo ou, nos criados antes dele, pelo nome. */
export function findTeamBeneficiary(beneficiaries: Beneficiary[], team: Pick<TeamSummary, "id" | "name">): Beneficiary | undefined {
    const byId = beneficiaries.find((beneficiary) => beneficiary.id === teamBeneficiaryId(team.id));
    if (byId) return byId;
    const name = normalizeComparisonText(team.name);
    return beneficiaries.find((beneficiary) => !beneficiary.isSelfProfile && beneficiary.source === "personal" && normalizeComparisonText(beneficiary.name) === name);
}

/** Versão do beneficiário com nome e foto da equipe; null quando já está igual. */
export function syncedTeamBeneficiary(existing: Beneficiary | undefined, team: Pick<TeamSummary, "id" | "name" | "avatarImage">): Beneficiary | null {
    if (existing && existing.name === team.name && existing.avatarImage === team.avatarImage && existing.type === "cost_center" && existing.isActive) return null;
    return {
        id: existing?.id ?? teamBeneficiaryId(team.id),
        userId: existing?.userId ?? null,
        familyId: null,
        source: "personal",
        isSelfProfile: false,
        name: team.name,
        type: "cost_center",
        avatarColor: existing?.avatarColor ?? null,
        avatarImage: team.avatarImage,
        isActive: true,
        sortOrder: existing?.sortOrder ?? 0,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
}
