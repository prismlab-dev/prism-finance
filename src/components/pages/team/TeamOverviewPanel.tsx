import { Link } from "react-router-dom";
import type { TeamSummary } from "../../../context/teamTypes";
import { TEAM_NAVIGATION_SUBITEMS } from "../../layout/appNavigation";
import { TeamAvatar } from "../../team/TeamAvatar";
import { TeamOverviewActivity } from "./TeamOverviewActivity";
import { MemberAvatar } from "./TeamOverviewRows";

export function TeamOverviewPanel({ team }: { team: TeamSummary }) {
    const sections = TEAM_NAVIGATION_SUBITEMS.filter((item) => item.id !== "team");
    const extraMembers = team.members.length - 5;

    return (
        <section className="space-y-4 pb-10">
            <header className="flex flex-col gap-4 px-1 py-3 md:flex-row md:px-2 md:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                    <TeamAvatar name={team.name} image={team.avatarImage} className="size-20 shrink-0 rounded-3xl" iconSize={32} />
                    <div className="min-w-0">
                        <h1 className="truncate text-2xl font-semibold tracking-tight text-white">{team.name}</h1>
                        <div className="mt-1 flex items-center gap-2 text-sm text-neutral-400">
                            <span className="flex -space-x-1.5" aria-hidden>
                                {team.members.slice(0, 5).map((member) => (
                                    <MemberAvatar key={member.uid} member={member} className="h-5 w-5 rounded-full border-2 border-surface" />
                                ))}
                            </span>
                            <span className="truncate">
                                {team.members.length} {team.members.length === 1 ? "pessoa" : "pessoas"}
                                {extraMembers > 0 ? ` (+${extraMembers})` : ""}
                            </span>
                        </div>
                    </div>
                </div>

                <nav aria-label="Seções da equipe" className="flex gap-1.5 overflow-x-auto">
                    {sections.map((section) => (
                        <Link
                            key={section.id}
                            to={section.path}
                            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-neutral-300 outline-none transition-colors hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white focus-visible:ring-2 focus-visible:ring-sky-400/60"
                        >
                            <span className="text-neutral-500" aria-hidden>{section.marker}</span>
                            {section.label}
                        </Link>
                    ))}
                </nav>
            </header>

            <TeamOverviewActivity team={team} />
        </section>
    );
}
