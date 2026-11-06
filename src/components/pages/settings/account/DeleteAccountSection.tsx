import { TextCursorInput, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { deleteOwnSupabaseAccount } from "../../../../supabase/auth/authService";
import { IconTextField } from "../../../transactions/IconTextField";
import { SETTINGS_DANGER_BUTTON_CLASS, SETTINGS_SECONDARY_BUTTON_CLASS, SettingsFeedback, SettingsSection } from "../SettingsSection";

const DELETE_CONFIRMATION_TEXT = "EXCLUIR";

export function DeleteAccountSection() {
    const [open, setOpen] = useState(false);
    const [confirmation, setConfirmation] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const confirmed = confirmation.trim().toUpperCase() === DELETE_CONFIRMATION_TEXT;

    function handleCancel() {
        setOpen(false);
        setConfirmation("");
        setError("");
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!confirmed) {
            return;
        }

        setLoading(true);
        setError("");
        try {
            await deleteOwnSupabaseAccount();
        } catch (deleteError) {
            console.error("Falha ao excluir conta:", deleteError);
            setError("Não foi possível excluir a conta agora. Nada foi apagado; tente de novo.");
            setLoading(false);
        }
    }

    return (
        <SettingsSection title="Excluir conta" description="Apaga a conta e todos os dados dela: carteiras, cartões, transações, orçamentos e desejos. Não dá para desfazer.">
            {!open ? (
                <button type="button" onClick={() => setOpen(true)} className={SETTINGS_DANGER_BUTTON_CLASS}>
                    <Trash2 size={16} aria-hidden />
                    Excluir conta
                </button>
            ) : (
                <form onSubmit={handleSubmit} className="max-w-md space-y-3 rounded-2xl border border-red-400/20 bg-red-500/[0.06] p-4">
                    <p className="text-sm leading-relaxed text-red-100/90">
                        Se você criou uma família, ela também será apagada e os membros perdem o acesso à wishlist compartilhada. Exporte um backup na aba Dados antes, se quiser guardar algo.
                    </p>
                    <IconTextField
                        ariaLabel={`Digite ${DELETE_CONFIRMATION_TEXT} para confirmar`}
                        icon={TextCursorInput}
                        value={confirmation}
                        onChange={(value) => {
                            setConfirmation(value);
                            setError("");
                        }}
                        placeholder={`Digite ${DELETE_CONFIRMATION_TEXT} para confirmar`}
                        disabled={loading}
                    />
                    <SettingsFeedback feedback={error ? { type: "error", message: error } : null} />
                    <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={!confirmed || loading} className={SETTINGS_DANGER_BUTTON_CLASS}>
                            <Trash2 size={16} aria-hidden />
                            {loading ? "Excluindo..." : "Excluir conta para sempre"}
                        </button>
                        <button type="button" onClick={handleCancel} disabled={loading} className={SETTINGS_SECONDARY_BUTTON_CLASS}>
                            Cancelar
                        </button>
                    </div>
                </form>
            )}
        </SettingsSection>
    );
}
