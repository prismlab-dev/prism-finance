import { X } from "lucide-react";
import { TEAM_INVITE_ROLES, TEAM_ROLE_LABELS } from "../../../context/team/teamLabels";
import type { TeamInviteRole, TeamMember, TeamRole } from "../../../context/teamTypes";
import { BeneficiaryAvatar } from "../../common/BeneficiaryAvatar";
import { SETTINGS_DANGER_BUTTON_CLASS } from "./SettingsSection";
import { TeamRoleSelect } from "./TeamRoleSelect";

interface TeamMembersListProps {
    members: TeamMember[];
    currentUserUid: string | undefined;
    currentUserRole: TeamRole;
    busy: boolean;
    onChangeRole: (member: TeamMember, role: TeamInviteRole) => void;
    onRemove: (member: TeamMember) => void;
}

/** Papéis que quem está logado pode atribuir: só o dono mexe em admins. */
export function assignableTeamRoles(currentUserRole: TeamRole): TeamInviteRole[] {
    return currentUserRole === "owner" ? TEAM_INVITE_ROLES : TEAM_INVITE_ROLES.filter((role) => role !== "admin");
}

export function canManageMember(currentUserRole: TeamRole, member: TeamMember, isCurrentUser: boolean): boolean {
    if (isCurrentUser || member.role === "owner") {
        return false;
    }

    return currentUserRole === "owner" || (currentUserRole === "admin" && member.role !== "admin");
}

export function TeamMembersList({ members, currentUserUid, currentUserRole, busy, onChangeRole, onRemove }: TeamMembersListProps) {
    const roles = assignableTeamRoles(currentUserRole);

    return (
        <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-surface">
            {members.map((member) => {
                const isCurrentUser = member.uid === currentUserUid;
                const canManage = canManageMember(currentUserRole, member, isCurrentUser);

                return (
                    <li key={member.uid} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                        <BeneficiaryAvatar
                            beneficiary={{ name: member.displayName, avatarImage: member.photoUrl, avatarColor: "#4B5563" }}
                            className="h-10 w-10 shrink-0 rounded-full border border-white/[0.12]"
                            textClassName="text-sm font-semibold text-white"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                                {member.displayName}
                                {isCurrentUser ? <span className="font-normal text-white/40"> (você)</span> : null}
                            </p>
                            <p className="truncate text-sm text-white/45">{member.email ?? "E-mail indisponível"}</p>
                        </div>
                        {canManage && member.role !== "owner" ? (
                            <div className="flex items-center gap-2">
                                <div className="w-32">
                                    <TeamRoleSelect label={`Papel de ${member.displayName}`} value={member.role} roles={roles} disabled={busy} menuWidth={288} onChange={(role) => onChangeRole(member, role)} />
                                </div>
                                <button type="button" onClick={() => onRemove(member)} disabled={busy} className={SETTINGS_DANGER_BUTTON_CLASS} aria-label={`Remover ${member.displayName}`}>
                                    <X size={15} aria-hidden />
                                </button>
                            </div>
                        ) : (
                            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/60">{TEAM_ROLE_LABELS[member.role]}</span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
