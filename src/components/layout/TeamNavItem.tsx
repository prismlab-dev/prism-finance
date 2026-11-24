import { Link } from "react-router-dom";
import { getPathForPage, usePage } from "../../context/PageContext";
import { useTeam } from "../../context/team/TeamContext";
import { TeamAvatar } from "../team/TeamAvatar";
import { TEAM_NAVIGATION_SUBITEMS } from "./appNavigation";
import { NavSubitems } from "./NavSubitems";

interface TeamNavItemProps {
    compactAtLaptop: boolean;
    indicatorLayoutId: string;
    onNavigate?: () => void;
}

/** Entrada da equipe: mesmo estilo dos itens comuns, com a foto da equipe no lugar do ícone. */
export function TeamNavItem({ compactAtLaptop, indicatorLayoutId, onNavigate }: TeamNavItemProps) {
    const { team } = useTeam();
    const { currentPage } = usePage();

    if (!team) {
        return null;
    }

    const isTeamPage = TEAM_NAVIGATION_SUBITEMS.some((item) => item.id === currentPage);
    const isActive = currentPage === "team";

    return (
        <div className="mt-2 w-full border-t border-white/[0.06] pt-3">
            <Link
                to={getPathForPage("team")}
                aria-label={`Equipe ${team.name}`}
                aria-current={isActive ? "page" : undefined}
                title={compactAtLaptop ? team.name : undefined}
                onClick={onNavigate}
                className={[
                    "flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-2 py-[7px] transition-colors duration-[180ms]",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40",
                    compactAtLaptop ? "laptop:justify-center laptop:gap-0 desktop:justify-start desktop:gap-2" : "",
                    isActive ? "bg-white/[0.15] text-white" : isTeamPage ? "text-neutral-300 hover:bg-white/[0.05]" : "text-neutral-600 hover:bg-white/[0.05] hover:text-neutral-300",
                ].join(" ")}
            >
                <TeamAvatar name={team.name} image={team.avatarImage} className="size-5 shrink-0 rounded-[5px]" iconSize={12} />
                <span
                    className={[
                        "min-w-0 translate-y-px truncate text-xs font-medium uppercase tracking-[0.02em]",
                        compactAtLaptop ? "laptop:hidden desktop:inline" : "",
                    ].join(" ")}
                >
                    {team.name}
                </span>
            </Link>
            <NavSubitems items={TEAM_NAVIGATION_SUBITEMS} activeId={currentPage} indicatorLayoutId={indicatorLayoutId} compactAtLaptop={compactAtLaptop} onNavigate={onNavigate} />
        </div>
    );
}
