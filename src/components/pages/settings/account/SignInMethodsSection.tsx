import type { UserIdentity } from "@supabase/supabase-js";
import { LoaderCircle, Mail } from "lucide-react";
import { useState, type ReactNode } from "react";
import { resolveSupabaseAuthErrorMessage } from "../../../../supabase/auth/authErrorMessages";
import { linkGoogleIdentity, unlinkSupabaseIdentity } from "../../../../supabase/auth/authService";
import { GoogleIcon } from "../../../common/GoogleIcon";
import { SETTINGS_DANGER_BUTTON_CLASS, SETTINGS_PRIMARY_BUTTON_CLASS, SettingsFeedback, SettingsSection } from "../SettingsSection";

type SignInMethodsSectionProps = {
    email: string | null;
    identities: UserIdentity[];
    loading: boolean;
    redirectError: string | null;
    onChanged: () => Promise<void>;
};

function readIdentityEmail(identity: UserIdentity | undefined): string | null {
    const email = identity?.identity_data?.email;
    return typeof email === "string" && email.trim() ? email : null;
}

function MethodRow({ icon, name, detail, linked, action }: { icon: ReactNode; name: string; detail: string; linked: boolean; action?: ReactNode }) {
    return (
        <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4">
            <span aria-hidden className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-white/70">
                {icon}
            </span>
            <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-white">
                    {name}
                    <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-normal ${linked ? "bg-emerald-500/15 text-emerald-200" : "bg-white/[0.06] text-white/50"}`}
                    >
                        {linked ? "Conectado" : "Não conectado"}
                    </span>
                </p>
                <p className="mt-0.5 truncate text-sm text-white/45">{detail}</p>
            </div>
            {action}
        </li>
    );
}

export function SignInMethodsSection({ email, identities, loading, redirectError, onChanged }: SignInMethodsSectionProps) {
    const [pending, setPending] = useState<"link" | "unlink" | null>(null);
    const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(redirectError ? { type: "error", message: redirectError } : null);

    const emailIdentity = identities.find((identity) => identity.provider === "email");
    const googleIdentity = identities.find((identity) => identity.provider === "google");
    const canUnlinkGoogle = identities.length > 1;

    async function handleLinkGoogle() {
        setPending("link");
        setFeedback(null);
        try {
            // Sai da página: o Google devolve o usuário para /configuracoes.
            await linkGoogleIdentity();
        } catch (error) {
            console.error("Falha ao vincular Google:", error);
            setFeedback({ type: "error", message: resolveSupabaseAuthErrorMessage(error, "Não foi possível vincular a conta Google.") });
            setPending(null);
        }
    }

    async function handleUnlinkGoogle() {
        if (!googleIdentity) {
            return;
        }

        setPending("unlink");
        setFeedback(null);
        try {
            await unlinkSupabaseIdentity(googleIdentity);
            await onChanged();
            setFeedback({ type: "success", message: "Google desvinculado. Use seu e-mail e senha para entrar." });
        } catch (error) {
            console.error("Falha ao desvincular Google:", error);
            setFeedback({ type: "error", message: resolveSupabaseAuthErrorMessage(error, "Não foi possível desvincular a conta Google.") });
        } finally {
            setPending(null);
        }
    }

    return (
        <SettingsSection title="Formas de entrar" description="Conecte o Google para entrar com um clique. Seus dados continuam na mesma conta.">
            <div className="space-y-3">
                <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-surface" aria-busy={loading}>
                    <MethodRow
                        icon={<Mail size={17} />}
                        name="E-mail e senha"
                        detail={readIdentityEmail(emailIdentity) ?? email ?? "Sem e-mail cadastrado"}
                        linked={Boolean(emailIdentity)}
                    />
                    <MethodRow
                        icon={<GoogleIcon />}
                        name="Google"
                        detail={googleIdentity ? (readIdentityEmail(googleIdentity) ?? "Conta Google conectada") : "Entre com sua conta Google em vez da senha."}
                        linked={Boolean(googleIdentity)}
                        action={
                            loading ? (
                                <LoaderCircle size={18} aria-label="Carregando" className="animate-spin text-white/40" />
                            ) : googleIdentity ? (
                                <button
                                    type="button"
                                    onClick={() => void handleUnlinkGoogle()}
                                    disabled={!canUnlinkGoogle || pending !== null}
                                    title={canUnlinkGoogle ? undefined : "É a única forma de entrar nesta conta."}
                                    className={SETTINGS_DANGER_BUTTON_CLASS}
                                >
                                    {pending === "unlink" ? "Desvinculando..." : "Desvincular"}
                                </button>
                            ) : (
                                <button type="button" onClick={() => void handleLinkGoogle()} disabled={pending !== null} className={SETTINGS_PRIMARY_BUTTON_CLASS}>
                                    {pending === "link" ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : null}
                                    {pending === "link" ? "Abrindo Google..." : "Vincular Google"}
                                </button>
                            )
                        }
                    />
                </ul>
                <SettingsFeedback feedback={feedback} />
            </div>
        </SettingsSection>
    );
}
