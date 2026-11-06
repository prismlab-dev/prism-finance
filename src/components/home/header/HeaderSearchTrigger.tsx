import { Search } from "lucide-react";
import { OPEN_COMMAND_PALETTE_EVENT } from "../../common/commandPalette/openCommandPalette";

const SHORTCUT_LABEL = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘ K" : "Ctrl K";

export function HeaderSearchTrigger() {
    return (
        <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))}
            aria-label="Buscar"
            aria-keyshortcuts="Control+K Meta+K"
            className="group flex h-10 shrink-0 items-center gap-2 rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white/40 transition-colors hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
            <Search size={16} className="shrink-0" />
            <span className="hidden w-28 text-left xl:inline">Buscar</span>
            <kbd className="hidden rounded-md border border-white/[0.1] bg-white/[0.03] px-1.5 py-0.5 font-sans text-[11px] text-white/45 group-hover:text-white/70 sm:inline">
                {SHORTCUT_LABEL}
            </kbd>
        </button>
    );
}
