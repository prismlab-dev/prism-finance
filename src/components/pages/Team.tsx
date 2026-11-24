import { usePage } from "../../context/PageContext";
import { useTeam } from "../../context/team/TeamContext";
import { TeamEmptyPanel } from "./team/TeamEmptyPanel";
import { TeamExpensesPage } from "./team/TeamExpensesPage";
import { TeamMembersPanel } from "./team/TeamMembersPanel";
import { TeamOverviewPanel } from "./team/TeamOverviewPanel";
import { TeamExpensesTableSkeleton, TeamMembersSkeleton, TeamOverviewSkeleton } from "./team/TeamSkeletons";

export function TeamPage() {
    const { team, loading } = useTeam();
    const { currentPage } = usePage();

    if (loading) {
        if (currentPage === "teamMembers") return <TeamMembersSkeleton />;
        if (currentPage === "teamTransactions") return <div className="finance-page w-full pb-4"><TeamExpensesTableSkeleton /></div>;
        return <TeamOverviewSkeleton />;
    }

    if (!team) {
        return <TeamEmptyPanel title="Você ainda não faz parte de uma equipe" description="Crie uma equipe ou entre com um código de convite em Configurações, na aba Equipe." />;
    }

    switch (currentPage) {
        case "teamMembers":
            return <TeamMembersPanel team={team} />;
        case "teamTransactions":
            return <TeamExpensesPage team={team} />;
        case "teamBudgets":
            return <TeamEmptyPanel title="Orçamentos da equipe" description="Aqui vão ficar os tetos de gasto da equipe. Essa parte ainda está em construção." />;
        default:
            return <TeamOverviewPanel team={team} />;
    }
}
