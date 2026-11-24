import type { TeamInviteRole, TeamRole } from "../teamTypes";

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
    owner: "Dono",
    admin: "Admin",
    member: "Membro",
    viewer: "Leitor",
};

export const TEAM_ROLE_DESCRIPTIONS: Record<TeamInviteRole, string> = {
    admin: "Convida pessoas, muda papéis de membros e leitores e edita a equipe.",
    member: "Lança e edita as finanças da equipe.",
    viewer: "Só visualiza as finanças da equipe.",
};

export const TEAM_INVITE_ROLES: TeamInviteRole[] = ["admin", "member", "viewer"];

const TEAM_ERROR_MESSAGES: Record<string, string> = {
    TEAM_ALREADY_MEMBER: "Você já faz parte de uma equipe. Saia dela antes de criar ou entrar em outra.",
    TEAM_INVITE_INVALID_OR_EXPIRED: "Esse código não existe, já foi usado ou expirou. Peça um novo ao admin da equipe.",
    TEAM_MEMBER_LIMIT_REACHED: "A equipe chegou ao limite de membros.",
    TEAM_ADMIN_REQUIRED: "Só donos e admins podem fazer isso.",
    TEAM_OWNER_REQUIRED: "Só o dono da equipe pode fazer isso.",
    TEAM_OWNER_IS_PROTECTED: "O dono não pode ser removido nem ter o papel alterado.",
};

export function resolveTeamErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : "";
    const code = Object.keys(TEAM_ERROR_MESSAGES).find((key) => message.includes(key));
    return code ? TEAM_ERROR_MESSAGES[code] : message.trim() || "Não foi possível concluir a operação agora.";
}

export function canManageTeam(role: TeamRole | null | undefined): boolean {
    return role === "owner" || role === "admin";
}
