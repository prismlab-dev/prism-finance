export type TeamRole = "owner" | "admin" | "member" | "viewer";

export type TeamInviteRole = Exclude<TeamRole, "owner">;

export interface TeamMember {
    uid: string;
    displayName: string;
    email: string | null;
    photoUrl: string | null;
    role: TeamRole;
    joinedAt: string;
}

export interface TeamInvite {
    inviteId: string;
    code: string;
    role: TeamInviteRole;
    createdAt: string;
}

export interface TeamSummary {
    id: string;
    name: string;
    avatarImage: string | null;
    maxMembers: number;
    currentUserRole: TeamRole;
    members: TeamMember[];
    invites: TeamInvite[];
}

/** Linha da projeção estreita da equipe: nunca traz carteira, cartão ou saldo pessoal. */
export interface TeamExpenseEntry {
    transactionId: string;
    groupId: string;
    payerId: string;
    kind: "expense" | "income" | "settlement";
    mode: "equal" | "percent" | "fixed" | "team" | null;
    title: string;
    amount: number;
    date: string;
    status: string;
    fromMemberId: string | null;
    shares: { memberId: string; amount: number; paid: boolean }[];
    /** Categoria do livro da equipe; null em acertos ou sem categoria. */
    category: { id: string; name: string; icon: string | null; color: string | null } | null;
    /** Observação visível para a equipe. */
    note: string | null;
}

/** Positivo: o membro tem a receber; negativo: deve. */
export interface TeamBalance {
    memberId: string;
    net: number;
}

export interface TeamExpensesView {
    expenses: TeamExpenseEntry[];
    balances: TeamBalance[];
}
