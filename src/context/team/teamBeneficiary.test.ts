import { describe, expect, it } from "vitest";
import type { Beneficiary } from "../finance/domainTypes";
import { findTeamBeneficiary, syncedTeamBeneficiary, teamBeneficiaryId } from "./teamBeneficiary";

const team = { id: "t1", name: "Prism Labs", avatarImage: "data:image/png;base64,AAA" };
const beneficiary = (patch: Partial<Beneficiary>): Beneficiary => ({
    id: "b1", userId: "u", familyId: null, source: "personal", isSelfProfile: false, name: "Prism Labs", type: "person",
    avatarColor: null, avatarImage: null, isActive: true, sortOrder: 3, createdAt: "2026-11-01T00:00:00Z", ...patch,
});

describe("beneficiário da equipe", () => {
    it("reaproveita o criado pelo nome e passa a usar a foto da equipe", () => {
        const legacy = beneficiary({});
        expect(findTeamBeneficiary([legacy], team)).toBe(legacy);
        expect(syncedTeamBeneficiary(legacy, team)).toMatchObject({ id: "b1", avatarImage: team.avatarImage, sortOrder: 3 });
    });

    it("não muda nada quando já está sincronizado e cria com id fixo quando não existe", () => {
        expect(syncedTeamBeneficiary(beneficiary({ avatarImage: team.avatarImage, type: "cost_center" }), team)).toBeNull();
        expect(syncedTeamBeneficiary(undefined, team)?.id).toBe(teamBeneficiaryId("t1"));
    });
});
