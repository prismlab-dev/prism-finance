import type { TeamExpense, TeamSplitMode } from "../finance/teamExpense";

export interface TeamSplitInput {
    teamId: string;
    kind?: "expense" | "income";
    mode: TeamSplitMode;
    categoryId: string | null;
    note?: string;
    total: number;
    /** Membros incluídos e o valor digitado (% ou R$; ignorado em "equal"). */
    members: { memberId: string; value: number; paidAt?: string }[];
}

/** Monta a divisão ou explica o que falta; o Postgres revalida ao gravar. */
export function buildTeamSplit({ teamId, kind = "expense", mode, categoryId, note, total, members }: TeamSplitInput): { teamExpense: TeamExpense } | { error: string } {
    const extra = note?.trim() ? { note: note.trim() } : {};
    if (mode === "team") return { teamExpense: { kind, teamId, mode, shares: [], categoryId, ...extra } };
    if (members.length === 0) return { error: "Escolha quem divide a despesa." };

    const cents = (value: number) => Math.round(value * 100);
    const sum = members.reduce((acc, member) => acc + cents(member.value), 0);
    if (mode === "percent" && sum !== 10000) return { error: `As porcentagens somam ${sum / 100}%, precisam somar 100%.` };
    if (mode === "fixed" && sum !== cents(total)) return { error: "Os valores da divisão precisam somar o total da despesa." };

    const shares = members.map((member) => ({
        memberId: member.memberId,
        value: mode === "equal" ? 0 : cents(member.value) / 100,
        ...(member.paidAt ? { paidAt: member.paidAt } : {}),
    }));
    return { teamExpense: { kind, teamId, mode, shares, categoryId, ...extra } };
}
