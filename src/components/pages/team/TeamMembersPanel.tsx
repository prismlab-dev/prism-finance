import { X } from "lucide-react";
import { useFinanceSession } from "../../../context/FinanceContext";
import { useTeam } from "../../../context/team/TeamContext";
import { TEAM_ROLE_DESCRIPTIONS, TEAM_ROLE_LABELS, canManageTeam } from "../../../context/team/teamLabels";
import type { TeamRole, TeamSummary } from "../../../context/teamTypes";
import { removeSupabaseTeamMember, updateSupabaseTeamMemberRole } from "../../../supabase/team";
import { BeneficiaryAvatar } from "../../common/BeneficiaryAvatar";
import { SETTINGS_DANGER_BUTTON_CLASS, SettingsFeedback } from "../settings/SettingsSection";
import { assignableTeamRoles, canManageMember } from "../settings/TeamMembersList";
import { TeamRoleSelect } from "../settings/TeamRoleSelect";
import { useTeamActionRunner } from "../settings/TeamSettingsTab";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" });

const ROLE_ORDER: TeamRole[] = ["owner", "admin", "member", "viewer"];

/** Mesma linguagem das etiquetas de status das transações, uma cor por papel. */
const ROLE_BADGE_CLASS: Record<TeamRole, string> = {
    owner: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    admin: "border-violet-400/30 bg-violet-500/10 text-violet-200",
    member: "border-sky-400/25 bg-sky-500/10 text-sky-200",
    viewer: "border-slate-400/25 bg-slate-500/10 text-slate-200",
};

const CELL = "overflow-hidden whitespace-nowrap border-b border-white/[0.04] px-3 py-2.5";

function CurrentUserTag() {
    return (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px]/3 font-medium text-emerald-200">
            Você
        </span>
    );
}

export function TeamMembersPanel({ team }: { team: TeamSummary }) {
    const { user } = useFinanceSession();
    const { refreshTeam } = useTeam();
    const { feedback, busy, run } = useTeamActionRunner(refreshTeam);
    const isManager = canManageTeam(team.currentUserRole);
    const roles = assignableTeamRoles(team.currentUserRole);
    const members = [...team.members].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.displayName.localeCompare(b.displayName, "pt-BR"));
    const fillPercent = Math.min(100, (team.members.length / team.maxMembers) * 100);

    return (
        <section className="space-y-4 pb-10">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">Membros</h1>
                <p className="mt-1 text-sm text-white/50">{isManager ? "Troque o papel de alguém direto na tabela." : "Só o dono e os admins mudam papéis."}</p>
            </div>

            <SettingsFeedback feedback={feedback} />

            <div className="min-w-0 rounded-2xl finance-surface">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4">
                    <h2 className="text-base font-semibold text-white">{team.name}</h2>
                    <div className="flex items-center gap-2.5 text-xs text-white/40">
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden>
                            <span className="block h-full rounded-full bg-white/50" style={{ width: `${fillPercent}%` }} />
                        </span>
                        <span>
                            <span className="font-medium tabular-nums text-white/75">{team.members.length}</span> de {team.maxMembers} vagas
                        </span>
                    </div>
                </div>

                <div className="elegant-scrollbar min-w-0 overflow-x-auto px-2 pb-2">
                    <table className="finance-table w-full min-w-[32rem] border-separate border-spacing-0 text-sm text-white/85">
                        <thead>
                            <tr>
                                <th scope="col" className="px-3 text-left">Pessoa</th>
                                <th scope="col" className="px-3 text-left">Papel</th>
                                <th scope="col" className="hidden px-3 text-left md:table-cell">Entrou em</th>
                                {isManager ? <th scope="col" className="w-12 px-3"><span className="sr-only">Ações</span></th> : null}
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((member) => {
                                const isCurrentUser = member.uid === user?.uid;
                                const canManage = canManageMember(team.currentUserRole, member, isCurrentUser);

                                return (
                                    <tr key={member.uid} className={isCurrentUser ? "bg-emerald-500/[0.03]" : undefined}>
                                        <td className={CELL}>
                                            <div className="flex min-w-0 items-center gap-3">
                                                <BeneficiaryAvatar
                                                    beneficiary={{ name: member.displayName, avatarImage: member.photoUrl, avatarColor: "#374151" }}
                                                    className="h-8 w-8 shrink-0 rounded-full"
                                                    textClassName="text-xs font-semibold text-white"
                                                />
                                                <div className="min-w-0">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <span className="truncate text-[14px] font-medium text-white">{member.displayName}</span>
                                                        {isCurrentUser ? <CurrentUserTag /> : null}
                                                    </div>
                                                    <p className="truncate text-xs text-white/40">{member.email ?? "E-mail indisponível"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={CELL}>
                                            {canManage && member.role !== "owner" ? (
                                                <div className="w-36">
                                                    <TeamRoleSelect
                                                        label={`Papel de ${member.displayName}`}
                                                        value={member.role}
                                                        roles={roles}
                                                        disabled={busy}
                                                        menuWidth={288}
                                                        onChange={(role) => void run(() => updateSupabaseTeamMemberRole(team.id, member.uid, role), `${member.displayName} agora é ${TEAM_ROLE_LABELS[role].toLowerCase()}.`)}
                                                    />
                                                </div>
                                            ) : (
                                                <span
                                                    title={member.role === "owner" ? "Tem todas as permissões." : TEAM_ROLE_DESCRIPTIONS[member.role]}
                                                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px]/4 font-medium ${ROLE_BADGE_CLASS[member.role]}`}
                                                >
                                                    {TEAM_ROLE_LABELS[member.role]}
                                                </span>
                                            )}
                                        </td>
                                        <td className={`${CELL} hidden text-white/55 md:table-cell`}>{dateFormatter.format(new Date(member.joinedAt))}</td>
                                        {isManager ? (
                                            <td className={`${CELL} text-right`}>
                                                {canManage ? (
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        className={SETTINGS_DANGER_BUTTON_CLASS}
                                                        aria-label={`Remover ${member.displayName}`}
                                                        title="Remover da equipe"
                                                        onClick={() => {
                                                            if (window.confirm(`Remover ${member.displayName} da equipe?`)) {
                                                                void run(() => removeSupabaseTeamMember(team.id, member.uid), `${member.displayName} saiu da equipe.`);
                                                            }
                                                        }}
                                                    >
                                                        <X size={15} aria-hidden />
                                                    </button>
                                                ) : null}
                                            </td>
                                        ) : null}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
