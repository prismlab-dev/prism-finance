import { Eye, PencilLine, ShieldCheck, type LucideIcon } from "lucide-react";
import { TEAM_ROLE_DESCRIPTIONS, TEAM_ROLE_LABELS } from "../../../context/team/teamLabels";
import type { TeamInviteRole } from "../../../context/teamTypes";
import { SingleSelectCombobox, type ComboboxOptionBase } from "../../transactions/SingleSelectCombobox";

interface TeamRoleOption extends ComboboxOptionBase {
    id: TeamInviteRole;
}

interface TeamRoleSelectProps {
    label: string;
    value: TeamInviteRole;
    roles: TeamInviteRole[];
    onChange: (role: TeamInviteRole) => void;
    disabled?: boolean;
    /** Largura do menu aberto; pode ser maior que o gatilho. */
    menuWidth?: number;
}

const ROLE_ICONS: Record<TeamInviteRole, LucideIcon> = {
    admin: ShieldCheck,
    member: PencilLine,
    viewer: Eye,
};

export function TeamRoleSelect({ label, value, roles, onChange, disabled = false, menuWidth }: TeamRoleSelectProps) {
    const options: TeamRoleOption[] = roles.map((role) => ({ id: role, label: TEAM_ROLE_LABELS[role], searchText: TEAM_ROLE_LABELS[role] }));

    return (
        <SingleSelectCombobox
            label={label}
            hideLabel
            disableSearch
            compactTrigger
            value={value}
            placeholder="Papel"
            emptyMessage="Nenhum papel disponível."
            options={options}
            disabled={disabled}
            overlayWidth={menuWidth}
            onChange={(next) => onChange(next as TeamInviteRole)}
            renderSelectedContent={(option) => <span className="truncate">{option.label}</span>}
            renderOptionContent={(option) => {
                const Icon = ROLE_ICONS[option.id];
                return (
                    <span className="flex min-w-0 items-start gap-2.5 py-0.5">
                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/70" aria-hidden>
                            <Icon size={14} />
                        </span>
                        <span className="flex min-w-0 flex-col">
                            <span className="text-sm text-white">{option.label}</span>
                            <span className="text-xs leading-snug text-white/45">{TEAM_ROLE_DESCRIPTIONS[option.id]}</span>
                        </span>
                    </span>
                );
            }}
        />
    );
}
