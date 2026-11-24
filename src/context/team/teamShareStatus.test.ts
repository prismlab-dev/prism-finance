import { describe, expect, it } from "vitest";
import type { TeamExpenseEntry } from "../teamTypes";
import { buildTeamShareStatus } from "./teamShareStatus";

const base = { groupId: "g", mode: "equal" as const, title: "", status: "paid", category: null, note: null };
const expense = (id: string, date: string, payerId: string, shares: [string, number][]): TeamExpenseEntry => ({
    ...base, transactionId: id, kind: "expense", payerId, date, amount: 0, fromMemberId: null,
    shares: shares.map(([memberId, amount]) => ({ memberId, amount, paid: false })),
});
const settlement = (id: string, from: string, to: string, amount: number): TeamExpenseEntry => ({
    ...base, transactionId: id, kind: "settlement", mode: null, payerId: to, fromMemberId: from, date: "2026-11-30", amount, shares: [],
});

describe("buildTeamShareStatus", () => {
    it("quita as partes da despesa mais antiga primeiro e ignora a parte de quem pagou", () => {
        const status = buildTeamShareStatus([
            expense("new", "2026-11-20", "ana", [["ana", 10], ["bia", 10]]),
            expense("old", "2026-11-01", "ana", [["ana", 30], ["bia", 30]]),
            settlement("s", "bia", "ana", 35),
        ]);
        expect(status.get("old")).toEqual([{ memberId: "bia", amount: 30, paid: true }]);
        expect(status.get("new")).toEqual([{ memberId: "bia", amount: 10, paid: false }]);
    });

    it("parte confirmada na despesa já conta como paga", () => {
        const entry = expense("e", "2026-11-01", "ana", [["bia", 20]]);
        entry.shares[0].paid = true;
        expect(buildTeamShareStatus([entry]).get("e")?.[0]?.paid).toBe(true);
    });

    it("acerto para outro credor não quita a parte", () => {
        const status = buildTeamShareStatus([expense("e", "2026-11-01", "ana", [["bia", 20]]), settlement("s", "bia", "caio", 20)]);
        expect(status.get("e")?.[0]?.paid).toBe(false);
    });
});
