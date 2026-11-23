import { Hexagon, KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { finishPasswordRecovery } from "../../auth/passwordRecovery";
import { resolveSupabaseAuthErrorMessage } from "../../supabase/auth/authErrorMessages";
import { setSupabasePassword, signOutSupabase } from "../../supabase/auth/authService";
import { IconTextField } from "../transactions/IconTextField";
import { SettingsFeedback } from "./settings/SettingsSection";

type ResetPasswordPageProps = {
    email: string | null;
};

/** Substitui o app inteiro enquanto a senha não é trocada; a única outra saída é desconectar. */
export function ResetPasswordPage({ email }: ResetPasswordPageProps) {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState<"save" | "signOut" | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (newPassword.length < 6) {
            setError("A nova senha precisa ter no mínimo 6 caracteres.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("As senhas não conferem.");
            return;
        }

        setError("");
        setLoading("save");

        try {
            await setSupabasePassword(newPassword);
            finishPasswordRecovery();
        } catch (err) {
            console.error("Falha ao redefinir senha:", err);
            setError(resolveSupabaseAuthErrorMessage(err, "Não foi possível redefinir a senha agora."));
            setLoading(null);
        }
    }

    async function handleCancel() {
        setError("");
        setLoading("signOut");

        try {
            await signOutSupabase();
        } catch (err) {
            console.error("Falha ao sair da conta:", err);
            setError("Não foi possível sair da conta agora.");
            setLoading(null);
        }
    }

    return (
        <main className="flex min-h-screen flex-col bg-canvas px-4 py-8 text-white sm:px-8">
            <div className="flex items-center gap-2 font-medium">
                <Hexagon size={25} aria-hidden />
                <span className="uppercase">Silus</span>
            </div>

            <div className="mx-auto my-auto w-full max-w-sm py-10">
                <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.025em]">Redefina sua senha</h1>
                <p className="mt-2 break-words text-sm text-neutral-400">Crie uma nova senha{email ? ` para ${email}` : ""} para continuar usando o Silus.</p>

                <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
                    <IconTextField
                        ariaLabel="Nova senha"
                        type="password"
                        autoComplete="new-password"
                        icon={KeyRound}
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="Nova senha (mínimo 6 caracteres)"
                        disabled={loading !== null}
                    />
                    <IconTextField
                        ariaLabel="Confirmar nova senha"
                        type="password"
                        autoComplete="new-password"
                        icon={KeyRound}
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="Confirmar nova senha"
                        disabled={loading !== null}
                    />

                    <SettingsFeedback feedback={error ? { type: "error", message: error } : null} />

                    <button
                        type="submit"
                        disabled={loading !== null}
                        className="mt-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-canvas transition hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {loading === "save" ? "Salvando..." : "Salvar nova senha"}
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleCancel()}
                        disabled={loading !== null}
                        className="rounded-xl px-4 py-2.5 text-sm text-neutral-400 transition hover:text-white focus-visible:outline-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading === "signOut" ? "Saindo..." : "Cancelar e sair"}
                    </button>
                </form>
            </div>
        </main>
    );
}
