import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AppBrand } from "./AppBrand";
import { AppSidebar } from "./AppSidebar";
import { AuthShell } from "./AuthShell";
import { BudgetNavSubitems } from "./BudgetNavSubitems";
import { BugReportButton } from "./BugReportButton";
import { FinanceSyncDiagnosticButton } from "./FinanceSyncDiagnosticButton";
import { FinanceSyncRecoveryButton } from "./FinanceSyncRecoveryButton";
import { FinanceSyncStatus } from "./FinanceSyncStatus";
import { NavSection } from "./NavSection";
import { NavSubitems } from "./NavSubitems";
import { SidebarContent } from "./SidebarContent";
import { StatementNavSubitems } from "./StatementNavSubitems";

// Estrutura do app: marca, navegação lateral, status de sincronização e moldura das telas de login.
const meta = { title: "Componentes/Layout/Estrutura do app", parameters: { layout: "fullscreen" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Marca: Story = { name: "AppBrand", render: () => <AppBrand /> };
export const MarcaCompacta: Story = { name: "AppBrand — compacta", render: () => <AppBrand compactAtLaptop showVersion={false} /> };

export const BarraLateral: Story = {
    name: "AppSidebar",
    parameters: { route: "/home" },
    render: () => <AppSidebar isMobileOpen={false} onCloseMobile={fn()} />,
};
export const BarraLateralMobile: Story = {
    name: "AppSidebar — gaveta mobile aberta",
    parameters: { route: "/home" },
    render: () => <AppSidebar isMobileOpen onCloseMobile={fn()} />,
};
export const ConteudoDaSidebar: Story = {
    name: "SidebarContent",
    parameters: { route: "/budgets" },
    render: () => (
        <div className="h-[640px] w-64 rounded-2xl border border-white/[0.09] bg-surface">
            <SidebarContent variant="mobile" onClose={fn()} />
        </div>
    ),
};
export const Navegacao: Story = { name: "NavSection", parameters: { route: "/home" }, render: () => <div className="w-60"><NavSection /></div> };

export const SubitensDeNavegacao: Story = {
    name: "NavSubitems",
    render: () => (
        <div className="w-60">
            <NavSubitems
                indicatorLayoutId="story-subitems"
                activeId="b"
                items={[
                    { id: "a", label: "Fatura aberta", path: "/statement" },
                    { id: "b", label: "Fatura anterior", path: "/statement?m=1" },
                ]}
            />
        </div>
    ),
};
export const SubitensDeOrcamento: Story = {
    name: "BudgetNavSubitems",
    parameters: { route: "/budgets" },
    render: () => <div className="w-60"><BudgetNavSubitems indicatorLayoutId="story-budget" /></div>,
};
export const SubitensDeFatura: Story = {
    name: "StatementNavSubitems",
    parameters: { route: "/statement" },
    render: () => <div className="w-60"><StatementNavSubitems indicatorLayoutId="story-statement" /></div>,
};

export const StatusDeSincronizacao: Story = { name: "FinanceSyncStatus", render: () => <FinanceSyncStatus /> };
export const BotaoDiagnostico: Story = { name: "FinanceSyncDiagnosticButton", render: () => <FinanceSyncDiagnosticButton /> };
export const BotaoRecuperar: Story = { name: "FinanceSyncRecoveryButton", render: () => <FinanceSyncRecoveryButton /> };
export const BotaoReportarBug: Story = { name: "BugReportButton", render: () => <BugReportButton /> };

export const MolduraDeLogin: Story = {
    name: "AuthShell",
    render: () => (
        <AuthShell>
            <div className="mx-auto max-w-sm rounded-2xl border border-white/[0.09] bg-surface p-6">Conteúdo da tela de autenticação</div>
        </AuthShell>
    ),
};
