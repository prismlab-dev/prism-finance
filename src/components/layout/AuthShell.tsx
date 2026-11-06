import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePage } from "../../context/PageContext";
import { useAppearance } from "../../lib/appearance";
import { CommandPalette } from "../common/commandPalette/CommandPalette";
import { Header } from "../home/Header";
import { DisplayModal } from "../modal/DisplayModal";
import { AppSidebar } from "./AppSidebar";

interface AuthShellProps {
    children: ReactNode;
    mainClassName?: string;
}

export function AuthShell({ children, mainClassName = "text-white" }: AuthShellProps) {
    const { currentPage } = usePage();
    const isLumen = useAppearance().layout === "lumen";
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const openMobileSidebar = useCallback(() => setIsMobileSidebarOpen(true), []);
    const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);

    useEffect(() => {
        closeMobileSidebar();
    }, [closeMobileSidebar, currentPage]);

    const main = <main className={["min-w-0 flex-1 pb-4 pt-2 elegant-scrollbar", isLumen ? "min-h-0 overflow-y-auto px-2 mx-2 mb-2 laptop:ml-0 rounded-xl bg-canvas [--app-header-offset:0px]" : "max-h-215 px-3 sm:px-4", mainClassName].join(" ")}>{children}</main>;

    return (
        <>
            <DisplayModal />
            <CommandPalette />
            <div className={`text-white ${isLumen ? "bg-zinc-950" : "min-h-screen bg-canvas"}`}>
                {isLumen ? (
                    // Lumen: um único header no topo; a sidebar começa abaixo dele, na navegação.
                    <div className="flex h-dvh flex-col">
                        <Header layout="lumen" onOpenSidebar={openMobileSidebar} />
                        <div className="flex min-h-0 min-w-0 flex-1">
                            <AppSidebar isMobileOpen={isMobileSidebarOpen} onCloseMobile={closeMobileSidebar} />
                            {main}
                        </div>
                    </div>
                ) : (
                    <div className="flex min-h-screen">
                        <AppSidebar isMobileOpen={isMobileSidebarOpen} onCloseMobile={closeMobileSidebar} />

                        <div className="flex min-w-0 flex-1 flex-col">
                            <Header onOpenSidebar={openMobileSidebar} />
                            {main}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
