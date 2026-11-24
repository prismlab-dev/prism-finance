import type { TransactionGroup } from "./domainTypes";

/** equal: partes iguais entre os listados; percent: value em %; fixed: value em R$ do total; team: custo 100% da equipe. */
export type TeamSplitMode = "equal" | "percent" | "fixed" | "team";

export interface TeamExpenseShare {
    memberId: string;
    value: number;
    /** Quando quem pagou confirmou que recebeu esta parte; fica na própria despesa. */
    paidAt?: string;
}

/**
 * Vínculo de uma transação pessoal com a equipe, guardado no próprio grupo: o lado
 * pessoal (saldo/fatura) e o lado da equipe vêm da mesma linha. O Postgres valida a
 * divisão e projeta os saldos entre membros (migration 035).
 */
export type TeamExpense =
    | { /** Despesa paga ou receita recebida por um membro, dividida com a equipe. */ kind: "expense" | "income"; teamId: string; mode: TeamSplitMode; shares: TeamExpenseShare[]; /** Categoria do livro da equipe. */ categoryId: string | null; /** Status visto pela equipe quando pago no cartão (o pessoal segue a fatura). */ teamStatus?: "paid" | "pending"; /** Observação visível para a equipe. */ note?: string }
    | { kind: "settlement"; teamId: string; fromMemberId: string };

function parseShares(value: unknown): TeamExpenseShare[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item): TeamExpenseShare[] => {
        const amount = Number(item?.value);
        if (typeof item?.memberId !== "string" || !Number.isFinite(amount)) return [];
        return [{ memberId: item.memberId, value: amount, ...(typeof item.paidAt === "string" ? { paidAt: item.paidAt } : {}) }];
    });
}

/** Ordem de chaves fixa: o jsonb reordena e o delta de sync compara valores serializados. */
export function buildTeamExpense(value: TeamExpense): TeamExpense {
    return value.kind !== "settlement"
        ? { kind: value.kind, teamId: value.teamId, mode: value.mode, shares: value.shares.map((share) => ({ memberId: share.memberId, value: share.value, ...(share.paidAt ? { paidAt: share.paidAt } : {}) })), categoryId: value.categoryId, ...(value.teamStatus ? { teamStatus: value.teamStatus } : {}), ...(value.note ? { note: value.note } : {}) }
        : { kind: "settlement", teamId: value.teamId, fromMemberId: value.fromMemberId };
}

export function parseTeamExpense(value: unknown): Pick<TransactionGroup, "teamExpense"> {
    if (typeof value !== "object" || value === null) return {};
    const raw = value as Record<string, unknown>;
    if (typeof raw.teamId !== "string") return {};
    if (raw.kind === "settlement" && typeof raw.fromMemberId === "string") {
        return { teamExpense: buildTeamExpense({ kind: "settlement", teamId: raw.teamId, fromMemberId: raw.fromMemberId }) };
    }
    if ((raw.kind === "expense" || raw.kind === "income") && (raw.mode === "equal" || raw.mode === "percent" || raw.mode === "fixed" || raw.mode === "team")) {
        const categoryId = typeof raw.categoryId === "string" ? raw.categoryId : null;
        const teamStatus = raw.teamStatus === "paid" || raw.teamStatus === "pending" ? raw.teamStatus : undefined;
        const note = typeof raw.note === "string" && raw.note.trim() ? raw.note : undefined;
        return { teamExpense: buildTeamExpense({ kind: raw.kind, teamId: raw.teamId, mode: raw.mode, shares: parseShares(raw.shares), categoryId, teamStatus, note }) };
    }
    return {};
}

/** Despesa ou receita com divisão (não um acerto antigo). */
export function isTeamSplitEntry(value: { kind: string } | undefined | null): boolean {
    return value?.kind === "expense" || value?.kind === "income";
}

export function isTeamSettlement(group: Pick<TransactionGroup, "teamExpense"> | undefined): boolean {
    return group?.teamExpense?.kind === "settlement";
}
