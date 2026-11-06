import { KeyRound, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { AppUser } from "../../../../auth/appUser";
import { PASSWORD_RECOVERY_STORAGE_KEY } from "../../../../hooks/useAuthListener";
import { resolveSupabaseAuthErrorMessage } from "../../../../supabase/auth/authErrorMessages";
import { setSupabasePassword, updateSupabasePassword } from "../../../../supabase/auth/authService";
import { IconTextField } from "../../../transactions/IconTextField";
import { SETTINGS_PRIMARY_BUTTON_CLASS, SettingsFeedback, SettingsSection } from "../SettingsSection";

type PasswordSectionProps = {
    user: AppUser;
    supportsPassword: boolean;
};

export function PasswordSection({ user, supportsPassword }: PasswordSectionProps) {
    const [isRecoverySession, setIsRecoverySession] = useState(() => window.localStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === "true");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    function validate(): string | null {
        if (!isRecoverySession && !currentPassword.trim()) return "Digite sua senha atual.";
        if (newPassword.length < 6) return "A nova senha precisa ter no mínimo 6 caracteres.";
        if (newPassword !== confirmPassword) return "As novas senhas não conferem.";
        if (currentPassword === newPassword) return "Escolha uma senha diferente da atual.";
        return null;
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!user.email) {
            return;
        }

        const validationError = validate();
        if (validationError) {
            setFeedback({ type: "error", message: validationError });
            return;
        }

        setLoading(true);
        setFeedback(null);

        try {
            if (isRecoverySession) {
                await setSupabasePassword(newPassword);
                window.localStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
                setIsRecoverySession(false);
            } else {
                await updateSupabasePassword({ email: user.email, currentPassword, newPassword });
            }
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setFeedback({ type: "success", message: "Senha alterada." });
        } catch (error) {
            console.error("Falha ao trocar senha:", error);
            setFeedback({ type: "error", message: resolveSupabaseAuthErrorMessage(error, "Não foi possível alterar a senha agora.") });
        } finally {
            setLoading(false);
        }
    }

    function bind(setter: (value: string) => void) {
        return (value: string) => {
            setter(value);
            setFeedback(null);
        };
    }

    return (
        <SettingsSection title="Senha" description="Usada para entrar com e-mail. Quem entra só pelo Google não precisa dela.">
            {!supportsPassword ? (
                <SettingsFeedback feedback={{ type: "info", message: "Esta conta entra pelo Google, então não tem senha do Silus." }} />
            ) : (
                <form onSubmit={handleSubmit} className="max-w-md space-y-3">
                    {isRecoverySession ? (
                        <SettingsFeedback feedback={{ type: "info", message: "Você entrou por um link de redefinição. Defina a nova senha para concluir." }} />
                    ) : (
                        <IconTextField
                            ariaLabel="Senha atual"
                            type="password"
                            autoComplete="current-password"
                            icon={LockKeyhole}
                            value={currentPassword}
                            onChange={bind(setCurrentPassword)}
                            placeholder="Senha atual"
                            disabled={loading}
                        />
                    )}
                    <IconTextField
                        ariaLabel="Nova senha"
                        type="password"
                        autoComplete="new-password"
                        icon={KeyRound}
                        value={newPassword}
                        onChange={bind(setNewPassword)}
                        placeholder="Nova senha"
                        disabled={loading}
                    />
                    <IconTextField
                        ariaLabel="Confirmar nova senha"
                        type="password"
                        autoComplete="new-password"
                        icon={KeyRound}
                        value={confirmPassword}
                        onChange={bind(setConfirmPassword)}
                        placeholder="Confirmar nova senha"
                        disabled={loading}
                    />

                    <SettingsFeedback feedback={feedback} />

                    <button type="submit" disabled={loading} className={SETTINGS_PRIMARY_BUTTON_CLASS}>
                        {loading ? "Alterando..." : "Alterar senha"}
                    </button>
                </form>
            )}
        </SettingsSection>
    );
}
