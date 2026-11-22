import { Bug, ClipboardCheck, ClipboardX } from "lucide-react";
import { useEffect, useState } from "react";
import { useFinanceSync } from "../../context/FinanceContext";

const FEEDBACK_DURATION_MS = 4000;
const FEEDBACK = {
    idle: { label: "Achou um bug?", detail: "Copiar relatório", Icon: Bug, iconClassName: "text-rose-300" },
    copied: { label: "Relatório copiado", detail: "Cole e envie pra gente", Icon: ClipboardCheck, iconClassName: "text-emerald-300" },
    error: { label: "Não foi copiado", detail: "Tente de novo", Icon: ClipboardX, iconClassName: "text-amber-300" },
};

interface BugReportButtonProps {
    compactAtLaptop?: boolean;
}

export function BugReportButton({ compactAtLaptop = false }: BugReportButtonProps) {
    const { copySyncDiagnostic } = useFinanceSync();
    const [feedback, setFeedback] = useState<keyof typeof FEEDBACK>("idle");
    const { label, detail, Icon, iconClassName } = FEEDBACK[feedback];

    useEffect(() => {
        if (feedback === "idle") return undefined;
        const timeout = window.setTimeout(() => setFeedback("idle"), FEEDBACK_DURATION_MS);
        return () => window.clearTimeout(timeout);
    }, [feedback]);

    const handleReport = () => {
        copySyncDiagnostic()
            .then(() => setFeedback("copied"))
            .catch(() => setFeedback("error"));
    };

    return (
        <div className={["px-2 pt-1", compactAtLaptop ? "laptop:px-0 desktop:px-2" : ""].join(" ")}>
            <button
                type="button"
                onClick={handleReport}
                aria-label={`${FEEDBACK.idle.label} ${FEEDBACK.idle.detail}`}
                title="Copia o diagnóstico e suas últimas ações para você enviar à equipe do Prism"
                className={[
                    "group flex w-full items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-left transition-colors hover:border-white/[0.14] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40",
                    compactAtLaptop ? "laptop:mx-auto laptop:w-11 laptop:justify-center desktop:mx-0 desktop:w-full desktop:justify-start" : "",
                ].join(" ")}
            >
                <Icon
                    size={16}
                    strokeWidth={2}
                    aria-hidden
                    className={[
                        "shrink-0 transition-transform duration-200 ease-out",
                        iconClassName,
                        feedback === "idle" ? "motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:rotate-12" : "",
                    ].join(" ")}
                />
                <span className={["flex min-w-0 flex-1 flex-col leading-snug", compactAtLaptop ? "laptop:hidden desktop:flex" : ""].join(" ")}>
                    <span className="truncate text-[12.5px] font-medium text-white/85">{label}</span>
                    <span className="truncate text-[11px] text-white/50 transition-colors group-hover:text-white/75">{detail}</span>
                </span>
            </button>
            <span role="status" className="sr-only">
                {feedback === "idle" ? "" : `${label}. ${detail}`}
            </span>
        </div>
    );
}
