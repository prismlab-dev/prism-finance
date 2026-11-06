import type { ReactNode } from "react";

type SettingsSectionProps = {
    title: string;
    description: string;
    children: ReactNode;
};

/** Linha de configuração: explicação à esquerda, controles à direita (empilha no mobile). */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
    return (
        <section className="grid gap-4 border-t border-white/[0.06] py-7 first:border-t-0 first:pt-2 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-10">
            <div>
                <h3 className="text-[15px] font-medium text-white">{title}</h3>
                <p className="mt-1.5 max-w-[34ch] text-sm leading-relaxed text-white/45">{description}</p>
            </div>
            <div className="min-w-0">{children}</div>
        </section>
    );
}

type SettingsFeedbackProps = {
    feedback: { type: "error" | "success" | "info"; message: string } | null;
};

const FEEDBACK_TONE_CLASS = {
    error: "border-red-400/25 bg-red-500/10 text-red-100",
    success: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
    info: "border-white/[0.08] bg-white/[0.03] text-white/65",
} as const;

export function SettingsFeedback({ feedback }: SettingsFeedbackProps) {
    if (!feedback) {
        return null;
    }

    return (
        <p role={feedback.type === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${FEEDBACK_TONE_CLASS[feedback.type]}`}>
            {feedback.message}
        </p>
    );
}

export const SETTINGS_PRIMARY_BUTTON_CLASS =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-50 transition-colors hover:border-emerald-400/45 hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-60";

export const SETTINGS_SECONDARY_BUTTON_CLASS =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-white/80 transition-colors hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-60";

export const SETTINGS_DANGER_BUTTON_CLASS =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-100 transition-colors hover:border-red-400/30 hover:bg-red-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:cursor-not-allowed disabled:opacity-60";
