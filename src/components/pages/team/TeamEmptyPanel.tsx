import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { getPathForPage } from "../../../context/PageContext";

interface TeamEmptyPanelProps {
    title: string;
    description: string;
}

export function TeamEmptyPanel({ title, description }: TeamEmptyPanelProps) {
    return (
        <section className="flex min-h-[calc(100vh-10rem)] flex-col items-start justify-center gap-4 px-1 sm:px-4">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
            <p className="max-w-[60ch] text-sm leading-relaxed text-white/55">{description}</p>
            <Link
                to={getPathForPage("settings")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm text-white/80 transition-colors hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
                <Settings size={15} aria-hidden />
                Abrir configurações
            </Link>
        </section>
    );
}
