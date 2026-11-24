import { Hexagon, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { resolveSupabaseAuthErrorMessage } from "../../supabase/auth/authErrorMessages";
import { sendSupabasePasswordReset } from "../../supabase/auth/authService";
import { IconTextField } from "../transactions/IconTextField";
import { Button } from "../ui/Button";
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

                    <Button type="submit" variant="solid" size="lg" disabled={loading} className="mt-2 w-full">
                        {loading ? "Enviando..." : "Enviar novo link"}
                    </Button>
                    <Button variant="ghost" size="lg" className="font-normal! text-neutral-400!" type="button" onClick={onLeave}>
                        {isSignedIn ? "Continuar no Silus" : "Voltar para o login"}
                    </Button>
                </form>
            </div>
        </main>
    );
}
