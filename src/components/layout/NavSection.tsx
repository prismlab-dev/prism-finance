import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { getPathForPage, usePage } from "../../context/PageContext";
import { BudgetNavSubitems } from "./BudgetNavSubitems";
import { APP_NAVIGATION_ITEMS, REGISTRY_NAVIGATION_SUBITEMS, TRANSACTION_NAVIGATION_SUBITEMS, normalizeNavigationPage } from "./appNavigation";
import { NavSubitems } from "./NavSubitems";
import { StatementNavSubitems } from "./StatementNavSubitems";

const COLLAPSED_STORAGE_KEY = "prism:nav-collapsed";
const PAGES_WITH_SUBITEMS = new Set(["transactions", "statement", "budgets", "registry"]);

function readCollapsedPages(): string[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(COLLAPSED_STORAGE_KEY) ?? "[]");
        return Array.isArray(parsed) ? parsed.filter((page): page is string => typeof page === "string") : [];
    } catch {
        return [];
    }
}

interface NavSectionProps {
    compactAtLaptop?: boolean;
    indicatorLayoutId?: string;
    onNavigate?: () => void;
}

export function NavSection({ compactAtLaptop = false, indicatorLayoutId = "nav-indicator", onNavigate }: NavSectionProps) {
    const [hoveredNav, setHoveredNav] = useState<string | null>(null);
    const { currentPage } = usePage();
    const normalizedPage = normalizeNavigationPage(currentPage);
    const activeItem = APP_NAVIGATION_ITEMS.find((item) => item.page === normalizedPage);
    const indicatorTarget = hoveredNav ?? activeItem?.label ?? null;
    const [collapsedPages, setCollapsedPages] = useState(readCollapsedPages);

    const toggleCollapsed = (page: string) => {
        setCollapsedPages((current) => {
            const next = current.includes(page) ? current.filter((item) => item !== page) : [...current, page];
            try {
                localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next));
            } catch {
                // Preferência só de conveniência; segue sem persistir.
            }
            return next;
        });
    };

    return (
        <nav className="relative flex flex-col items-center gap-1 p-[3px]" aria-label="Navegação principal" onMouseLeave={() => setHoveredNav(null)}>
            {APP_NAVIGATION_ITEMS.map(({ label, page, icon }) => {
                const isActive = normalizedPage === page;
                const isLit = hoveredNav ? hoveredNav === label : isActive;
                const hasSubitems = PAGES_WITH_SUBITEMS.has(page);
                const isExpanded = hasSubitems && !collapsedPages.includes(page);

                return (
                    <Fragment key={page}>
                        <div className="relative w-full">
                            <Link
                                to={getPathForPage(page)}
                                aria-label={label}
                                aria-current={isActive ? "page" : undefined}
                                title={compactAtLaptop ? label : undefined}
                                onClick={onNavigate}
                                onMouseEnter={() => setHoveredNav(label)}
                                className={[
                                    "relative z-10 flex w-full items-center whitespace-nowrap rounded-lg px-2 py-[7px]",
                                    hasSubitems ? "pr-8" : "",
                                    "text-[12.5px] font-medium tracking-[0.02em] transition-colors duration-[180ms]",
                                    compactAtLaptop ? "laptop:justify-center desktop:justify-start" : "",
                                    isLit ? "text-neutral-300" : "text-neutral-600",
                                    isActive ? "bg-white/[0.15] text-white" : "",
                                ].join(" ")}
                            >
                                {indicatorTarget === label ? (
                                    <motion.span
                                        layoutId={indicatorLayoutId}
                                        className="absolute inset-0 w-full rounded-lg bg-white/[0.05]"
                                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                                    />
                                ) : null}

                                <span
                                    className={[
                                        "relative z-10 flex min-w-0 items-center gap-2 transition-[gap] duration-300 ease-out",
                                        compactAtLaptop ? "laptop:gap-0 desktop:gap-2" : "",
                                    ].join(" ")}
                                >
                                    <span className="flex shrink-0 items-center justify-center">{icon}</span>
                                    <span
                                        className={[
                                            "max-w-44 overflow-hidden whitespace-nowrap text-xs uppercase opacity-100 transition-[max-width,opacity] duration-300 ease-out",
                                            compactAtLaptop ? "laptop:max-w-0 laptop:opacity-0 desktop:max-w-44 desktop:opacity-100" : "",
                                        ].join(" ")}
                                    >
                                        {label}
                                    </span>
                                </span>
                            </Link>
                            {hasSubitems ? (
                                <button
                                    type="button"
                                    onClick={() => toggleCollapsed(page)}
                                    onMouseEnter={() => setHoveredNav(label)}
                                    aria-expanded={isExpanded}
                                    aria-label={`${isExpanded ? "Recolher" : "Expandir"} subpáginas de ${label}`}
                                    className={[
                                        "absolute right-1 top-1/2 z-20 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 transition-colors duration-150",
                                        "hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40",
                                        "[@media(max-height:820px)]:hidden",
                                        compactAtLaptop ? "laptop:hidden desktop:flex" : "",
                                    ].join(" ")}
                                >
                                    <ChevronDown
                                        size={14}
                                        className={["transition-transform duration-200 motion-reduce:transition-none", isExpanded ? "" : "-rotate-90"].join(
                                            " ",
                                        )}
                                    />
                                </button>
                            ) : null}
                        </div>
                        <AnimatePresence initial={false}>
                            {isExpanded ? (
                                <motion.div
                                    key="subitems"
                                    className="w-full overflow-hidden"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                >
                                    {page === "budgets" ? (
                                        <BudgetNavSubitems
                                            indicatorLayoutId={`${indicatorLayoutId}-budgets`}
                                            compactAtLaptop={compactAtLaptop}
                                            onNavigate={onNavigate}
                                        />
                                    ) : page === "statement" ? (
                                        <StatementNavSubitems
                                            indicatorLayoutId={`${indicatorLayoutId}-statement`}
                                            compactAtLaptop={compactAtLaptop}
                                            onNavigate={onNavigate}
                                        />
                                    ) : (
                                        <NavSubitems
                                            items={page === "registry" ? REGISTRY_NAVIGATION_SUBITEMS : TRANSACTION_NAVIGATION_SUBITEMS}
                                            activeId={currentPage}
                                            indicatorLayoutId={`${indicatorLayoutId}-${page}`}
                                            compactAtLaptop={compactAtLaptop}
                                            onNavigate={onNavigate}
                                        />
                                    )}
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </Fragment>
                );
            })}
        </nav>
    );
}
