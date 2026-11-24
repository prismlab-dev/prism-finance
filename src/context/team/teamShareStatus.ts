import type { TeamExpenseEntry } from "../teamTypes";

export interface TeamShareStatus {
    memberId: string;
    amount: number;
    paid: boolean;
}

/**
 * Quem ainda deve a parte de cada despesa. A parte confirmada na própria despesa
 * (paidAt) está paga; acertos antigos, registrados como transação, ainda quitam as
 * partes do devedor nas despesas do credor da mais antiga para a mais nova.
 * ponytail: casa acerto e despesa pelo par devedor→credor; um acerto que quite
 * dívida simplificada via terceiro não marca as despesas originais.
 */
export function buildTeamShareStatus(expenses: TeamExpenseEntry[]): Map<string, TeamShareStatus[]> {
    const pairKey = (from: string, to: string) => `${from}>${to}`;
    const settledCents = new Map<string, number>();
    expenses
        .filter((entry) => entry.kind === "settlement" && entry.fromMemberId)
        .forEach((entry) => {
            const key = pairKey(entry.fromMemberId ?? "", entry.payerId);
            settledCents.set(key, (settledCents.get(key) ?? 0) + Math.round(entry.amount * 100));
        });

    const result = new Map<string, TeamShareStatus[]>();
    [...expenses]
        .filter((entry) => entry.kind !== "settlement")
        .sort((a, b) => a.date.localeCompare(b.date) || a.transactionId.localeCompare(b.transactionId))
        .forEach((entry) => {
            const shares = entry.shares
                .filter((share) => share.memberId !== entry.payerId && share.amount > 0)
                .map((share) => {
                    // Receita: só a confirmação do repasse na própria receita conta; acertos antigos eram de despesas.
                    if (share.paid || entry.kind === "income") return { memberId: share.memberId, amount: share.amount, paid: share.paid };
                    const key = pairKey(share.memberId, entry.payerId);
                    const cents = Math.round(share.amount * 100);
                    const available = settledCents.get(key) ?? 0;
                    const paid = available >= cents;
                    settledCents.set(key, Math.max(0, available - cents));
                    return { memberId: share.memberId, amount: share.amount, paid };
                });
            result.set(entry.transactionId, shares);
        });
    return result;
}
