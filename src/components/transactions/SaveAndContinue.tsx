import { useEffect, useState } from "react";

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

const BASE = "inline-flex h-10 items-center justify-center px-5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/70 disabled:cursor-not-allowed";

export function FormActionButtons({ submitting, justSaved, submitLabel, onCancel, onSubmit, onContinue, continueDisabled }: FormActionButtonsProps) {
    const [clicked, setClicked] = useState<"submit" | "continue" | null>(null);
    const loading = (action: "submit" | "continue") => submitting && clicked === action;

    return (
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button type="button" onClick={onCancel} disabled={submitting} className={`${BASE} rounded-xl font-medium text-white/50 hover:text-white disabled:opacity-50`}>
                Cancelar
            </button>
            {/* One joined control: equal grid columns keep both halves the same size, whatever the label. */}
            <div className={`grid overflow-hidden rounded-xl border border-white/[0.16] ${onContinue ? "divide-y divide-white/[0.16] sm:grid-cols-2 sm:divide-x sm:divide-y-0" : ""}`}>
                {onContinue ? (
                    <button
                        type="button"
                        onClick={() => { setClicked("continue"); onContinue(); }}
                        disabled={submitting || continueDisabled}
                        aria-live="polite"
                        className={`${BASE} ${justSaved ? "bg-emerald-400/[0.14] text-emerald-200" : "text-white/80 hover:bg-white/[0.05] hover:text-white"} disabled:opacity-60`}
                    >
                        {loading("continue") ? <Saving /> : justSaved && !submitting ? "Salvo!" : "Salvar e continuar"}
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={() => { setClicked("submit"); onSubmit(); }}
                    disabled={submitting}
                    className={`${BASE} min-w-36 bg-white/[0.92] text-surface hover:bg-white disabled:opacity-60`}
                >
                    {loading("submit") ? <Saving /> : submitLabel}
                </button>
            </div>
        </div>
    );
}

function Saving() {
    return <span className="animate-pulse motion-reduce:animate-none">Salvando...</span>;
}
