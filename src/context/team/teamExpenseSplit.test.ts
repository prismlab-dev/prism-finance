import { describe, expect, it } from "vitest";
import { buildTeamSplit } from "./teamExpenseSplit";

describe("buildTeamSplit", () => {
    const base = { teamId: "t", categoryId: null, total: 90 };

    it("divide igualmente sem valores", () => {
        expect(buildTeamSplit({ ...base, mode: "equal", members: [{ memberId: "a", value: 7 }, { memberId: "b", value: 0 }] }))
            .toEqual({ teamExpense: { kind: "expense", teamId: "t", mode: "equal", shares: [{ memberId: "a", value: 0 }, { memberId: "b", value: 0 }], categoryId: null } });
    });

    it("exige 100% e soma exata no valor fixo", () => {
        expect(buildTeamSplit({ ...base, mode: "percent", members: [{ memberId: "a", value: 60 }] })).toHaveProperty("error");
        expect(buildTeamSplit({ ...base, mode: "fixed", members: [{ memberId: "a", value: 45 }, { memberId: "b", value: 44.99 }] })).toHaveProperty("error");
        expect(buildTeamSplit({ ...base, mode: "fixed", members: [{ memberId: "a", value: 45 }, { memberId: "b", value: 45 }] })).toHaveProperty("teamExpense");
    });

    it("custo 100% da equipe não divide entre membros", () => {
        expect(buildTeamSplit({ ...base, mode: "team", members: [] })).toEqual({ teamExpense: { kind: "expense", teamId: "t", mode: "team", shares: [], categoryId: null } });
    });
});
