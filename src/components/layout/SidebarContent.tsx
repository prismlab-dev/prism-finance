import { X } from "lucide-react";
import { AppBrand } from "./AppBrand";
import { BugReportButton } from "./BugReportButton";
import { FinanceSyncStatus } from "./FinanceSyncStatus";
import { NavSection } from "./NavSection";
import { IconButton } from "../ui/IconButton";

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
                            <IconButton variant="outline" size="md" shape="square" type="button" onClick={onClose} aria-label="Fechar menu lateral">
                                <X size={16} />
                            </IconButton>
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
                <BugReportButton compactAtLaptop={isResponsive} />
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
