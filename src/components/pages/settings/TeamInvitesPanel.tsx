import { Copy, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { TEAM_ROLE_LABELS } from "../../../context/team/teamLabels";
import type { TeamInvite, TeamInviteRole } from "../../../context/teamTypes";
import { SETTINGS_PRIMARY_BUTTON_CLASS, SETTINGS_SECONDARY_BUTTON_CLASS } from "./SettingsSection";
import { TeamRoleSelect } from "./TeamRoleSelect";

interface TeamInvitesPanelProps {
    invites: TeamInvite[];
    roles: TeamInviteRole[];
    isFull: boolean;
    busy: boolean;
    onCreate: (role: TeamInviteRole) => void;
    onCopy: (invite: TeamInvite) => void;
    onCancel: (invite: TeamInvite) => void;
}

export function TeamInvitesPanel({ invites, roles, isFull, busy, onCreate, onCopy, onCancel }: TeamInvitesPanelProps) {
    const [role, setRole] = useState<TeamInviteRole>("member");

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="w-36">
                    <TeamRoleSelect label="Papel de quem entrar pelo convite" value={role} roles={roles} disabled={busy} onChange={setRole} />
                </div>
                <button type="button" onClick={() => onCreate(role)} disabled={busy || isFull} className={SETTINGS_PRIMARY_BUTTON_CLASS}>
                    <UserPlus size={16} aria-hidden />
                    Gerar convite
                </button>
            </div>
            {isFull ? <p className="text-sm text-white/45">A equipe está cheia. Remova alguém para convidar outra pessoa.</p> : null}
            {invites.length === 0 ? (
                <p className="text-sm text-white/45">Nenhum convite pendente.</p>
            ) : (
                <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-surface">
                    {invites.map((invite) => (
                        <li key={invite.inviteId} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                            <div className="min-w-0 flex-1">
                                <p className="break-all font-mono text-sm text-white">{invite.code}</p>
                                <p className="mt-0.5 text-xs text-white/40">
                                    Entra como {TEAM_ROLE_LABELS[invite.role].toLowerCase()}. Criado em {new Date(invite.createdAt).toLocaleString("pt-BR")}
                                </p>
                            </div>
                            <button type="button" onClick={() => onCopy(invite)} className={SETTINGS_SECONDARY_BUTTON_CLASS}>
                                <Copy size={15} aria-hidden />
                                Copiar
                            </button>
                            <button type="button" onClick={() => onCancel(invite)} disabled={busy} className={SETTINGS_SECONDARY_BUTTON_CLASS} aria-label={`Cancelar convite ${invite.code}`}>
                                <X size={15} aria-hidden />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
