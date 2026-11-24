import { Building2, Link2, LogOut, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFinanceSession } from "../../../context/FinanceContext";
import { useTeam } from "../../../context/team/TeamContext";
import { TEAM_INVITE_ROLES, TEAM_ROLE_DESCRIPTIONS, TEAM_ROLE_LABELS, canManageTeam, resolveTeamErrorMessage } from "../../../context/team/teamLabels";
import type { TeamSummary } from "../../../context/teamTypes";
import {
    acceptSupabaseTeamInvite,
    cancelSupabaseTeamInvite,
    createSupabaseTeam,
    createSupabaseTeamInvite,
    deleteSupabaseTeam,
    removeSupabaseTeamMember,
    updateSupabaseTeam,
    updateSupabaseTeamMemberRole,
} from "../../../supabase/team";
import { TeamAvatar } from "../../team/TeamAvatar";
import { IconTextField } from "../../transactions/IconTextField";
import { SETTINGS_DANGER_BUTTON_CLASS, SETTINGS_PRIMARY_BUTTON_CLASS, SETTINGS_SECONDARY_BUTTON_CLASS, SettingsFeedback, SettingsSection } from "./SettingsSection";
import { TeamInvitesPanel } from "./TeamInvitesPanel";
import { TeamMembersList, assignableTeamRoles } from "./TeamMembersList";
import { TeamPhotoPicker } from "./TeamPhotoPicker";
import { TeamSettingsSkeleton } from "../team/TeamSkeletons";

type Feedback = { type: "error" | "success"; message: string } | null;
type RunAction = (action: () => Promise<unknown>, successMessage: string) => Promise<boolean>;

export function useTeamActionRunner(refreshTeam: () => Promise<void>) {
    const [feedback, setFeedback] = useState<Feedback>(null);
    const [busy, setBusy] = useState(false);

    const run: RunAction = async (action, successMessage) => {
        if (busy) {
            return false;
        }

        setFeedback(null);
        setBusy(true);
        try {
            await action();
            await refreshTeam();
            setFeedback({ type: "success", message: successMessage });
            return true;
        } catch (error) {
            setFeedback({ type: "error", message: resolveTeamErrorMessage(error) });
            return false;
        } finally {
            setBusy(false);
        }
    };

    return { feedback, setFeedback, busy, run };
}

async function copyToClipboard(text: string) {
    await navigator.clipboard?.writeText(text);
}

export function TeamSettingsTab() {
    const { team, loading, refreshTeam } = useTeam();
    const { feedback, setFeedback, busy, run } = useTeamActionRunner(refreshTeam);

    return (
        <div className="space-y-6">
            <header className="rounded-3xl border border-white/[0.08] bg-surface p-5 sm:p-7">
                <div className="flex items-center gap-4">
                    <TeamAvatar name={team?.name ?? "Equipe"} image={team?.avatarImage ?? null} className="size-14 rounded-2xl" iconSize={24} />
                    <div className="min-w-0">
                        <h2 className="truncate text-2xl font-semibold tracking-tight text-white sm:text-[28px]">{team ? team.name : "Equipe"}</h2>
                        <p className="mt-1 text-sm text-white/50">
                            {team
                                ? `${team.members.length} de ${team.maxMembers} pessoas. Você é ${TEAM_ROLE_LABELS[team.currentUserRole].toLowerCase()}.`
                                : "Um espaço separado para as finanças da sua empresa ou time, com papéis para cada pessoa."}
                        </p>
                    </div>
                </div>
            </header>

            <div className="px-1 sm:px-2">
                <SettingsFeedback feedback={feedback} />
                {loading ? (
                    <TeamSettingsSkeleton />
                ) : team ? (
                    <TeamManagement key={team.id} team={team} busy={busy} run={run} onError={(message) => setFeedback({ type: "error", message })} onCopied={() => setFeedback({ type: "success", message: "Código copiado." })} />
                ) : (
                    <TeamOnboarding busy={busy} run={run} onError={(message) => setFeedback({ type: "error", message })} />
                )}
            </div>
        </div>
    );
}

function TeamOnboarding({ busy, run, onError }: { busy: boolean; run: RunAction; onError: (message: string) => void }) {
    const [name, setName] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [code, setCode] = useState("");

    return (
        <>
            <SettingsSection title="Criar equipe" description="Você vira o dono e decide quem entra e o que cada pessoa pode fazer.">
                <div className="max-w-md space-y-4">
                    <TeamPhotoPicker name={name || "Equipe"} image={image} onChange={setImage} onError={onError} disabled={busy} />
                    <IconTextField ariaLabel="Nome da equipe" icon={Building2} value={name} onChange={setName} placeholder="Nome da empresa ou do time" maxLength={80} disabled={busy} />
                    <button
                        type="button"
                        disabled={busy || !name.trim()}
                        className={SETTINGS_PRIMARY_BUTTON_CLASS}
                        onClick={() => void run(() => createSupabaseTeam(name.trim(), image), "Equipe criada. Ela já aparece no menu lateral.")}
                    >
                        <Building2 size={16} aria-hidden />
                        {busy ? "Criando..." : "Criar equipe"}
                    </button>
                </div>
            </SettingsSection>

            <SettingsSection title="Entrar com convite" description="Cole o código que o dono ou um admin da equipe enviou para você.">
                <div className="max-w-md space-y-3">
                    <IconTextField ariaLabel="Código do convite" icon={Link2} value={code} onChange={setCode} placeholder="Código do convite" disabled={busy} />
                    <button
                        type="button"
                        disabled={busy || !code.trim()}
                        className={SETTINGS_SECONDARY_BUTTON_CLASS}
                        onClick={() => void run(() => acceptSupabaseTeamInvite(code), "Você entrou na equipe.")}
                    >
                        <Link2 size={16} aria-hidden />
                        Aceitar convite
                    </button>
                </div>
            </SettingsSection>
        </>
    );
}

interface TeamManagementProps {
    team: TeamSummary;
    busy: boolean;
    run: RunAction;
    onError: (message: string) => void;
    onCopied: () => void;
}

function TeamManagement({ team, busy, run, onError, onCopied }: TeamManagementProps) {
    const { user } = useFinanceSession();
    const [name, setName] = useState(team.name);
    const [image, setImage] = useState(team.avatarImage);
    const isManager = canManageTeam(team.currentUserRole);
    const isOwner = team.currentUserRole === "owner";
    const hasIdentityChanges = name.trim() !== team.name || image !== team.avatarImage;
    const roles = assignableTeamRoles(team.currentUserRole);

    return (
        <>
            {isManager ? (
                <SettingsSection title="Nome e foto" description="Aparecem no menu lateral de todos os membros.">
                    <div className="max-w-md space-y-4">
                        <TeamPhotoPicker name={name || team.name} image={image} onChange={setImage} onError={onError} disabled={busy} />
                        <IconTextField ariaLabel="Nome da equipe" icon={Building2} value={name} onChange={setName} placeholder="Nome da equipe" maxLength={80} disabled={busy} />
                        <button
                            type="button"
                            disabled={busy || !name.trim() || !hasIdentityChanges}
                            className={SETTINGS_PRIMARY_BUTTON_CLASS}
                            onClick={() => void run(() => updateSupabaseTeam(team.id, name.trim(), image), "Alterações salvas.")}
                        >
                            <Save size={16} aria-hidden />
                            Salvar alterações
                        </button>
                    </div>
                </SettingsSection>
            ) : null}

            <SettingsSection title="Membros e permissões" description={isManager ? "Troque o papel de cada pessoa ou remova quem não faz mais parte." : "Quem faz parte da equipe e o papel de cada um."}>
                <TeamMembersList
                    members={team.members}
                    currentUserUid={user?.uid}
                    currentUserRole={team.currentUserRole}
                    busy={busy}
                    onChangeRole={(member, role) => void run(() => updateSupabaseTeamMemberRole(team.id, member.uid, role), `${member.displayName} agora é ${TEAM_ROLE_LABELS[role].toLowerCase()}.`)}
                    onRemove={(member) => {
                        if (window.confirm(`Remover ${member.displayName} da equipe?`)) {
                            void run(() => removeSupabaseTeamMember(team.id, member.uid), `${member.displayName} saiu da equipe.`);
                        }
                    }}
                />
            </SettingsSection>

            {isManager ? (
                <SettingsSection title="Convites" description="Escolha o papel, gere o código e envie para a pessoa. Cada código vale para uma pessoa por 7 dias.">
                    <TeamInvitesPanel
                        invites={team.invites}
                        roles={roles}
                        isFull={team.members.length >= team.maxMembers}
                        busy={busy}
                        onCreate={(role) =>
                            void run(async () => copyToClipboard((await createSupabaseTeamInvite(team.id, role)).code).catch(() => undefined), "Convite gerado e copiado para a área de transferência.")
                        }
                        onCopy={(invite) => void copyToClipboard(invite.code).then(onCopied, () => onError("Não foi possível copiar o código."))}
                        onCancel={(invite) => void run(() => cancelSupabaseTeamInvite(team.id, invite.inviteId), "Convite cancelado.")}
                    />
                </SettingsSection>
            ) : null}

            <SettingsSection title="O que cada papel pode fazer" description="O dono tem todas as permissões e é o único que mexe em admins.">
                <dl className="max-w-xl space-y-3 text-sm">
                    {TEAM_INVITE_ROLES.map((role) => (
                        <div key={role}>
                            <dt className="font-medium text-white">{TEAM_ROLE_LABELS[role]}</dt>
                            <dd className="text-white/55">{TEAM_ROLE_DESCRIPTIONS[role]}</dd>
                        </div>
                    ))}
                </dl>
            </SettingsSection>

            <SettingsSection title={isOwner ? "Excluir equipe" : "Sair da equipe"} description={isOwner ? "Remove a equipe para todos os membros. Não dá para desfazer." : "Você perde o acesso às finanças da equipe."}>
                <button
                    type="button"
                    disabled={busy}
                    className={SETTINGS_DANGER_BUTTON_CLASS}
                    onClick={() => {
                        if (!user || !window.confirm(isOwner ? `Excluir a equipe ${team.name} para todos?` : `Sair da equipe ${team.name}?`)) {
                            return;
                        }
                        void run(() => (isOwner ? deleteSupabaseTeam(team.id) : removeSupabaseTeamMember(team.id, user.uid)), isOwner ? "Equipe excluída." : "Você saiu da equipe.");
                    }}
                >
                    {isOwner ? <Trash2 size={16} aria-hidden /> : <LogOut size={16} aria-hidden />}
                    {isOwner ? "Excluir equipe" : "Sair da equipe"}
                </button>
            </SettingsSection>
        </>
    );
}
