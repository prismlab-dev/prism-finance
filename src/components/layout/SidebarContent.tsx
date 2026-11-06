import { X } from "lucide-react";
import { AppBrand } from "./AppBrand";
import { FinanceSyncStatus } from "./FinanceSyncStatus";
import { NavSection } from "./NavSection";

type SidebarContentVariant = "mobile" | "responsive";

interface SidebarContentProps {
    variant: SidebarContentVariant;
    onClose?: () => void;
    /** Lumen: a marca mora no header do app, então a sidebar começa na navegação. */
    showBrand?: boolean;
}

export function SidebarContent({ variant, onClose, showBrand = true }: SidebarContentProps) {
    const isResponsive = variant === "responsive";

    return (
        <div className="flex h-full min-h-0 flex-col gap-1">
            {showBrand ? (
                <div className="mt-2 flex shrink-0 flex-col gap-1">
                    <div
                        className={[
                            "flex min-h-10 items-center gap-2 px-2.5 pb-2 pt-1.5 font-medium text-white",
                            isResponsive ? "laptop:justify-center laptop:px-0 desktop:justify-start desktop:px-2.5" : "justify-between",
                        ].join(" ")}
                    >
                        <AppBrand compactAtLaptop={isResponsive} />

                        {onClose ? (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Fechar menu lateral"
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/70 transition-colors duration-200 hover:bg-white/[0.07] hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        ) : null}
                    </div>

                    <Divider />
                </div>
            ) : null}

            <div className="ghost-scrollbar min-h-0 flex-1 py-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                <NavSection compactAtLaptop={isResponsive} indicatorLayoutId={`nav-indicator-${variant}`} onNavigate={onClose} />
            </div>

            <div className="shrink-0 pt-2">
                <Divider />
                <FinanceSyncStatus compactAtLaptop={isResponsive} />
            </div>
        </div>
    );
}

function Divider() {
    return (
        <div className="my-1 w-full px-2">
            <div className="h-px w-full bg-zinc-500/20" />
        </div>
    );
}
