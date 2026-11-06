import { useEffect, useState, type ReactNode } from "react";
import { Check, LoaderCircle, Plus } from "lucide-react";

const SAVED_FLASH_MS = 1600;

/** Remounts the form (via `formKey`) after each "Salvar e continuar"; `justSaved` survives the remount to flash the button. */
export function useSaveAndContinue() {
    const [formKey, setFormKey] = useState(0);
    const [justSaved, setJustSaved] = useState(false);

    useEffect(() => {
        if (!justSaved) return;
        const timeout = window.setTimeout(() => setJustSaved(false), SAVED_FLASH_MS);
        return () => window.clearTimeout(timeout);
    }, [justSaved, formKey]);

    const markSaved = () => {
        setJustSaved(true);
        setFormKey((current) => current + 1);
    };

    return { formKey, justSaved, markSaved };
}

interface FormActionButtonsProps {
    submitting: boolean;
    justSaved: boolean;
    submitLabel: string;
    onCancel: () => void;
    onSubmit: () => void;
    /** Omit to hide "Salvar e continuar" (e.g. when editing). */
    onContinue?: () => void;
    continueDisabled?: boolean;
}

const BASE = "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131313] disabled:cursor-not-allowed disabled:active:scale-100";

export function FormActionButtons({ submitting, justSaved, submitLabel, onCancel, onSubmit, onContinue, continueDisabled }: FormActionButtonsProps) {
    const [clicked, setClicked] = useState<"submit" | "continue" | null>(null);
    const loading = (action: "submit" | "continue") => submitting && clicked === action;

    return (
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button type="button" onClick={onCancel} disabled={submitting} className={`${BASE} font-medium text-white/55 hover:bg-white/[0.05] hover:text-white disabled:opacity-50`}>
                Cancelar
            </button>
            {onContinue ? (
                <button
                    type="button"
                    onClick={() => { setClicked("continue"); onContinue(); }}
                    disabled={submitting || continueDisabled}
                    aria-live="polite"
                    className={`${BASE} min-w-44 border ${justSaved ? "border-emerald-300/60 bg-emerald-400/15 text-emerald-100" : "border-white/[0.14] bg-white/[0.03] text-white/85 hover:border-emerald-300/45 hover:text-emerald-50"} disabled:opacity-60`}
                >
                    <ButtonContent loading={loading("continue")} saved={justSaved && !submitting} icon={<Plus size={15} strokeWidth={2.4} />} label="Salvar e continuar" savedLabel="Salvo!" />
                </button>
            ) : null}
            <button
                type="button"
                onClick={() => { setClicked("submit"); onSubmit(); }}
                disabled={submitting}
                className={`${BASE} min-w-36 bg-emerald-400 text-[#052016] shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)] hover:bg-emerald-300 disabled:opacity-60`}
            >
                <ButtonContent loading={loading("submit")} saved={false} icon={<Check size={15} strokeWidth={2.6} />} label={submitLabel} savedLabel="" />
            </button>
        </div>
    );
}

function ButtonContent({ loading, saved, icon, label, savedLabel }: { loading: boolean; saved: boolean; icon: ReactNode; label: string; savedLabel: string }) {
    if (loading) {
        return (
            <>
                <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" />
                Salvando...
            </>
        );
    }
    if (saved) {
        return (
            <>
                <Check size={15} strokeWidth={2.6} className="text-emerald-300" />
                {savedLabel}
            </>
        );
    }
    return (
        <>
            {icon}
            {label}
        </>
    );
}
