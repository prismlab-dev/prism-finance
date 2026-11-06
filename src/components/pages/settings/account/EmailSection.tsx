import { Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { resolveSupabaseAuthErrorMessage } from "../../../../supabase/auth/authErrorMessages";
import { requestSupabaseEmailChange } from "../../../../supabase/auth/authService";
import { IconTextField } from "../../../transactions/IconTextField";
import { SETTINGS_PRIMARY_BUTTON_CLASS, SettingsFeedback, SettingsSection } from "../SettingsSection";

type EmailSectionProps = {
    email: string | null;
};

export function EmailSection({ email }: EmailSectionProps) {
    const [newEmail, setNewEmail] = useState("");
    const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const nextEmail = newEmail.trim().toLowerCase();

        if (!nextEmail) {
            setFeedback({ type: "error", message: "Digite o novo e-mail." });
            return;
        }

        if (nextEmail === email?.toLowerCase()) {
            setFeedback({ type: "error", message: "Este já é o seu e-mail atual." });
            return;
        }

        setLoading(true);
        setFeedback(null);

        try {
            await requestSupabaseEmailChange(nextEmail);
            setNewEmail("");
            setFeedback({ type: "success", message: `Enviamos um link de confirmação para ${nextEmail} e outro para o seu e-mail atual. A troca só vale depois que você confirmar nos dois.` });
        } catch (error) {
            console.error("Falha ao trocar e-mail:", error);
            setFeedback({ type: "error", message: resolveSupabaseAuthErrorMessage(error, "Não foi possível trocar o e-mail agora.") });
        } finally {
            setLoading(false);
        }
    }

    return (
        <SettingsSection title="E-mail" description="Usado para entrar e recuperar a senha. A troca precisa ser confirmada no e-mail atual e no novo.">
            <form onSubmit={handleSubmit} className="max-w-md space-y-3">
                <p className="text-sm text-white/55">
                    Atual: <span className="text-white/85">{email ?? "nenhum"}</span>
                </p>
                <IconTextField
                    ariaLabel="Novo e-mail"
                    type="email"
                    autoComplete="email"
                    icon={Mail}
                    value={newEmail}
                    onChange={(value) => {
                        setNewEmail(value);
                        setFeedback(null);
                    }}
                    placeholder="Novo e-mail"
                    disabled={loading}
                />

                <SettingsFeedback feedback={feedback} />

                <button type="submit" disabled={loading || !newEmail.trim()} className={SETTINGS_PRIMARY_BUTTON_CLASS}>
                    {loading ? "Enviando..." : "Trocar e-mail"}
                </button>
            </form>
        </SettingsSection>
    );
}
