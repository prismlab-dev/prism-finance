import { Copy, Info, Link2, ShieldUser, UserPlus, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useFinanceActions, useFinanceFamily, useFinanceSession } from "../../../context/FinanceContext";
import { resolveUserDisplayName } from "../../../lib/userProfile";
import { BeneficiaryAvatar } from "../../common/BeneficiaryAvatar";
import { IconTextField } from "../../transactions/IconTextField";
import { SETTINGS_DANGER_BUTTON_CLASS, SETTINGS_PRIMARY_BUTTON_CLASS, SETTINGS_SECONDARY_BUTTON_CLASS, SettingsFeedback, SettingsSection } from "./SettingsSection";

type FamilyMemberPhotoMap = Record<string, string | null>;

function resolveFamilyErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return "Nao foi possivel concluir a operacao agora.";
}

export function FamilySettingsTab() {
    const { user } = useFinanceSession();
    const family = useFinanceFamily();
    const { createFamily, generateFamilyInvite, joinFamilyByCode, removeFamilyMember } = useFinanceActions();
    const [familyName, setFamilyName] = useState("");
    const [inviteCodeInput, setInviteCodeInput] = useState("");
    const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
    const [isCreatingFamily, setIsCreatingFamily] = useState(false);
    const [isJoiningFamily, setIsJoiningFamily] = useState(false);
    const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
    const [removingMemberUid, setRemovingMemberUid] = useState<string | null>(null);
    const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

    const isAdmin = family?.currentUserRole === "admin";
    const activeMembers = useMemo(() => family?.members.filter((member) => member.status === "active") ?? [], [family?.members]);
    const pendingInvites = useMemo(() => family?.invites.filter((invite) => invite.status === "pending") ?? [], [family?.invites]);
    const memberPhotoUrls = useMemo<FamilyMemberPhotoMap>(() => Object.fromEntries(activeMembers.map((member) => [member.uid, null])), [activeMembers]);
    const userName = resolveUserDisplayName(user);
    const canCreateOrJoin = !family;

    const handleCreateFamily = async () => {
        if (isCreatingFamily) {
            return;
        }

        setFeedback(null);
        setIsCreatingFamily(true);
        try {
            await createFamily(familyName.trim() || `Familia de ${userName}`);
            setFamilyName("");
            setFeedback({
                type: "success",
                message: "Familia criada com sucesso. Agora voce ja pode gerar convites.",
            });
        } catch (error) {
            setFeedback({
                type: "error",
                message: resolveFamilyErrorMessage(error),
            });
        } finally {
            setIsCreatingFamily(false);
        }
    };

    const handleJoinFamily = async () => {
        if (!inviteCodeInput.trim() || isJoiningFamily) {
            return;
        }

        setFeedback(null);
        setIsJoiningFamily(true);
        try {
            await joinFamilyByCode(inviteCodeInput);
            setInviteCodeInput("");
            setFeedback({
                type: "success",
                message: "Convite aceito. A wishlist da familia ja foi conectada a sua conta.",
            });
        } catch (error) {
            setFeedback({
                type: "error",
                message: resolveFamilyErrorMessage(error),
            });
        } finally {
            setIsJoiningFamily(false);
        }
    };

    const handleGenerateInvite = async () => {
        if (!family?.id || isGeneratingInvite) {
            return;
        }

        setFeedback(null);
        setIsGeneratingInvite(true);
        try {
            const invite = await generateFamilyInvite();
            setCopiedInviteId(invite.inviteId);
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(invite.code);
            }
            setFeedback({
                type: "success",
                message: "Novo codigo gerado. Ele foi copiado para a area de transferencia quando disponivel.",
            });
        } catch (error) {
            setFeedback({
                type: "error",
                message: resolveFamilyErrorMessage(error),
            });
        } finally {
            setIsGeneratingInvite(false);
        }
    };

    const handleCopyInvite = async (inviteId: string, code: string) => {
        try {
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(code);
            }
            setCopiedInviteId(inviteId);
            setFeedback({
                type: "success",
                message: "Codigo copiado com sucesso.",
            });
        } catch {
            setFeedback({
                type: "error",
                message: "Nao foi possivel copiar o codigo automaticamente.",
            });
        }
    };

    const handleRemoveMember = async (memberUid: string, memberName: string) => {
        if (!family?.id || removingMemberUid) {
            return;
        }

        const shouldRemove = window.confirm(`Remover ${memberName} da familia?`);
        if (!shouldRemove) {
            return;
        }

        setFeedback(null);
        setRemovingMemberUid(memberUid);
        try {
            await removeFamilyMember(memberUid);
            setFeedback({
                type: "success",
                message: `${memberName} foi removido da familia.`,
            });
        } catch (error) {
            setFeedback({
                type: "error",
                message: resolveFamilyErrorMessage(error),
            });
        } finally {
            setRemovingMemberUid(null);
        }
    };

    return (
        <div className="space-y-6">
            <header className="rounded-3xl border border-white/[0.08] bg-[#101010] p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="truncate text-2xl font-semibold tracking-tight text-white sm:text-[28px]">{family ? family.name : "Família"}</h2>
                        <p className="mt-1 text-sm text-white/50">
                            {family
                                ? `${activeMembers.length} de ${family.maxMembers} membros. Você é ${isAdmin ? "admin" : "membro"}.`
                                : "Junte até cinco contas para compartilhar a wishlist."}
                        </p>
                    </div>
                    {family ? (
                        <div className="flex -space-x-2" aria-hidden>
                            {activeMembers.slice(0, 5).map((member) => (
                                <BeneficiaryAvatar
                                    key={member.uid}
                                    beneficiary={{ name: member.displayName, avatarImage: memberPhotoUrls[member.uid] ?? null, avatarColor: "#4B5563" }}
                                    className="h-10 w-10 rounded-full border-2 border-[#101010]"
                                    textClassName="text-sm font-semibold text-white"
                                />
                            ))}
                        </div>
                    ) : null}
                </div>
            </header>

            <div className="px-1 sm:px-2">
                <SettingsFeedback feedback={feedback} />

                {!family ? (
                    <>
                        <SettingsSection title="Criar família" description="Você vira o admin e pode convidar até quatro pessoas.">
                            <div className="max-w-md space-y-3">
                                <IconTextField
                                    ariaLabel="Nome da família"
                                    icon={Users}
                                    value={familyName}
                                    onChange={setFamilyName}
                                    placeholder={`Família de ${userName}`}
                                    disabled={!canCreateOrJoin || isCreatingFamily}
                                />
                                <button type="button" onClick={() => void handleCreateFamily()} disabled={!canCreateOrJoin || isCreatingFamily} className={SETTINGS_PRIMARY_BUTTON_CLASS}>
                                    <Users size={16} aria-hidden />
                                    {isCreatingFamily ? "Criando..." : "Criar família"}
                                </button>
                            </div>
                        </SettingsSection>

                        <SettingsSection title="Entrar com convite" description="Cole o código que o admin da família compartilhou com você.">
                            <div className="max-w-md space-y-3">
                                <IconTextField
                                    ariaLabel="Código do convite"
                                    icon={Link2}
                                    value={inviteCodeInput}
                                    onChange={setInviteCodeInput}
                                    placeholder="Código do convite"
                                    disabled={!canCreateOrJoin || isJoiningFamily}
                                />
                                <button
                                    type="button"
                                    onClick={() => void handleJoinFamily()}
                                    disabled={!canCreateOrJoin || !inviteCodeInput.trim() || isJoiningFamily}
                                    className={SETTINGS_SECONDARY_BUTTON_CLASS}
                                >
                                    <Link2 size={16} aria-hidden />
                                    {isJoiningFamily ? "Entrando..." : "Aceitar convite"}
                                </button>
                            </div>
                        </SettingsSection>
                    </>
                ) : (
                    <>
                        <SettingsSection title="Membros" description="Quem faz parte da família. Só o admin pode remover membros.">
                            <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-[#101010]">
                                {activeMembers.map((member) => {
                                    const isCurrentUser = member.uid === user?.uid;
                                    const canRemove = isAdmin && !isCurrentUser && member.role !== "admin";

                                    return (
                                        <li key={member.uid} className="flex items-center gap-3 px-4 py-3.5">
                                            <BeneficiaryAvatar
                                                beneficiary={{ name: member.displayName, avatarImage: memberPhotoUrls[member.uid] ?? null, avatarColor: "#4B5563" }}
                                                className="h-10 w-10 shrink-0 rounded-full border border-white/[0.12]"
                                                textClassName="text-sm font-semibold text-white"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="flex items-center gap-2 truncate text-sm font-medium text-white">
                                                    {member.displayName}
                                                    {isCurrentUser ? <span className="font-normal text-white/40">(você)</span> : null}
                                                    {member.role === "admin" ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-normal text-white/60">
                                                            <ShieldUser size={12} aria-hidden />
                                                            Admin
                                                        </span>
                                                    ) : null}
                                                </p>
                                                <p className="truncate text-sm text-white/45">{member.email ?? "E-mail indisponível"}</p>
                                            </div>
                                            {canRemove ? (
                                                <button
                                                    type="button"
                                                    onClick={() => void handleRemoveMember(member.uid, member.displayName)}
                                                    disabled={removingMemberUid === member.uid}
                                                    className={SETTINGS_DANGER_BUTTON_CLASS}
                                                    aria-label={`Remover ${member.displayName}`}
                                                >
                                                    <X size={15} aria-hidden />
                                                    <span className="hidden sm:inline">Remover</span>
                                                </button>
                                            ) : null}
                                        </li>
                                    );
                                })}
                            </ul>
                        </SettingsSection>

                        {isAdmin ? (
                            <SettingsSection title="Convites" description="Gere um código e envie para quem você quer adicionar. Cada código vale para uma pessoa.">
                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        onClick={() => void handleGenerateInvite()}
                                        disabled={isGeneratingInvite || activeMembers.length >= family.maxMembers}
                                        className={SETTINGS_PRIMARY_BUTTON_CLASS}
                                    >
                                        <UserPlus size={16} aria-hidden />
                                        {isGeneratingInvite ? "Gerando..." : "Gerar convite"}
                                    </button>
                                    {pendingInvites.length === 0 ? (
                                        <p className="text-sm text-white/45">Nenhum convite pendente.</p>
                                    ) : (
                                        <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-[#101010]">
                                            {pendingInvites.map((invite) => (
                                                <li key={invite.inviteId} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="break-all font-mono text-sm text-white">{invite.code}</p>
                                                        <p className="mt-0.5 text-xs text-white/40">Criado em {new Date(invite.createdAt).toLocaleString("pt-BR")}</p>
                                                    </div>
                                                    <button type="button" onClick={() => void handleCopyInvite(invite.inviteId, invite.code)} className={SETTINGS_SECONDARY_BUTTON_CLASS}>
                                                        <Copy size={15} aria-hidden />
                                                        {copiedInviteId === invite.inviteId ? "Copiado" : "Copiar"}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </SettingsSection>
                        ) : null}

                        <SettingsSection title="O que é compartilhado" description="O que os membros conseguem ver da sua conta.">
                            <p className="flex max-w-xl items-start gap-2 text-sm leading-relaxed text-white/60">
                                <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
                                Só a wishlist. Carteiras, cartões, transações e planejamento continuam privados.
                            </p>
                        </SettingsSection>
                    </>
                )}
            </div>
        </div>
    );
}
