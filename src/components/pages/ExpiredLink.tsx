import { Hexagon, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { resolveSupabaseAuthErrorMessage } from "../../supabase/auth/authErrorMessages";
import { sendSupabasePasswordReset } from "../../supabase/auth/authService";
import { IconTextField } from "../transactions/IconTextField";
import { SettingsFeedback } from "./settings/SettingsSection";

type ExpiredLinkPageProps = {
    isSignedIn: boolean;
    onLeave: () => void;
};

export function ExpiredLinkPage({ isSignedIn, onLeave }: ExpiredLinkPageProps) {
    const [email, setEmail] = useState("");
    const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const normalizedEmail = email.trim();
        if (!normalizedEmail) {
            setFeedback({ type: "error", message: "Digite seu e-mail para receber um novo link." });
            return;
        }

        setFeedback(null);
        setLoading(true);

        try {
            await sendSupabasePasswordReset(normalizedEmail);
            setFeedback({ type: "success", message: "Se houver uma conta com este e-mail, o novo link chega em alguns minutos." });
        } catch (err) {
            console.error("Falha ao reenviar redefinição de senha:", err);
            setFeedback({ type: "error", message: resolveSupabaseAuthErrorMessage(err, "Não foi possível enviar um novo link agora. Tente novamente em alguns minutos.") });
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen flex-col bg-canvas px-4 py-8 text-white sm:px-8">
            <div className="flex items-center gap-2 font-medium">
                <Hexagon size={25} aria-hidden />
                <span className="uppercase">Silus</span>
            </div>

            <div className="mx-auto my-auto w-full max-w-sm py-10">
                <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.025em]">Este link expirou ou já foi usado</h1>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">Se você queria redefinir a senha, informe seu e-mail para receber um novo link.</p>

                <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
                    <IconTextField
                        ariaLabel="E-mail"
                        type="email"
                        autoComplete="email"
                        icon={Mail}
                        value={email}
                        onChange={setEmail}
                        placeholder="E-mail"
                        disabled={loading}
                    />

                    <SettingsFeedback feedback={feedback} />

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-canvas transition hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {loading ? "Enviando..." : "Enviar novo link"}
                    </button>
                    <button
                        type="button"
                        onClick={onLeave}
                        className="rounded-xl px-4 py-2.5 text-sm text-neutral-400 transition hover:text-white focus-visible:outline-2 focus-visible:outline-white"
                    >
                        {isSignedIn ? "Continuar no Silus" : "Voltar para o login"}
                    </button>
                </form>
            </div>
        </main>
    );
}
