import type { Meta, StoryObj } from "@storybook/react-vite";
import { Route, Routes } from "react-router-dom";
import { fn } from "storybook/test";
import { PlanningPage } from "../../components/pages/Analysis";
import { BalancePage } from "../../components/pages/Balance";
import { BudgetsPage } from "../../components/pages/Budgets";
import { HomePage } from "../../components/pages/Home";
import { LoadingPage, PageSkeletonScreen } from "../../components/pages/Loading";
import { LoginPage } from "../../components/pages/Login";
import { RegistryPage } from "../../components/pages/Registry";
import { ReportsPage } from "../../components/pages/Reports";
import { SettingsPage } from "../../components/pages/Settings";
import { StatementPage } from "../../components/pages/Statement";
import { TransactionsPage } from "../../components/pages/TransactionsPage";
import { WishlistPage } from "../../components/pages/Wishlist";
import { ExpiredLinkPage } from "../../components/pages/ExpiredLink";
import { ResetPasswordPage } from "../../components/pages/ResetPassword";
import { AppSidebar } from "../../components/layout/AppSidebar";
import { Header } from "../../components/home/Header";
import { SAMPLE_BUDGETS_OVERVIEW } from "../mocks/sampleBudgets";

// Cada página do app inteira, com os dados fictícios no lugar do Supabase.
const meta = { title: "Telas/Páginas", parameters: { layout: "fullscreen" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Casca do app: barra lateral + topo + conteúdo da página. */
function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen">
            <AppSidebar isMobileOpen={false} onCloseMobile={fn()} />
            <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                <Header />
                <main className="min-w-0 flex-1">{children}</main>
            </div>
        </div>
    );
}

export const Inicio: Story = { name: "Início", parameters: { route: "/home" }, render: () => <AppShell><HomePage /></AppShell> };
export const Saldo: Story = { name: "Saldo", parameters: { route: "/balance" }, render: () => <AppShell><BalancePage /></AppShell> };
export const TransacoesDespesas: Story = { name: "Transações — despesas", parameters: { route: "/transactions/spending" }, render: () => <AppShell><TransactionsPage /></AppShell> };
export const TransacoesReceitas: Story = { name: "Transações — receitas", parameters: { route: "/transactions/income" }, render: () => <AppShell><TransactionsPage /></AppShell> };
export const TransacoesTransferencias: Story = { name: "Transações — transferências", parameters: { route: "/transactions/transfer" }, render: () => <AppShell><TransactionsPage /></AppShell> };
export const Extrato: Story = { name: "Extrato da fatura", parameters: { route: "/statement" }, render: () => <AppShell><StatementPage /></AppShell> };
export const Planejamento: Story = { name: "Planejamento", parameters: { route: "/planning" }, render: () => <AppShell><PlanningPage /></AppShell> };
export const Relatorios: Story = { name: "Relatórios", parameters: { route: "/reports" }, render: () => <AppShell><ReportsPage /></AppShell> };
export const Orcamentos: Story = {
    name: "Orçamentos — lista",
    parameters: { route: "/budgets" },
    render: () => <AppShell><Routes><Route path="/budgets/:budgetId?" element={<BudgetsPage />} /></Routes></AppShell>,
};
export const OrcamentoDetalhe: Story = {
    name: "Orçamentos — detalhe",
    parameters: { route: `/budgets/${SAMPLE_BUDGETS_OVERVIEW.progresses[0].budget.id}` },
    render: () => <AppShell><Routes><Route path="/budgets/:budgetId?" element={<BudgetsPage />} /></Routes></AppShell>,
};
export const Cadastros: Story = { name: "Cadastros", parameters: { route: "/registry" }, render: () => <AppShell><RegistryPage /></AppShell> };
export const Desejos: Story = { name: "Lista de desejos", parameters: { route: "/wishlist" }, render: () => <AppShell><WishlistPage /></AppShell> };
export const Configuracoes: Story = { name: "Configurações", parameters: { route: "/settings" }, render: () => <AppShell><SettingsPage /></AppShell> };

export const Login: Story = { name: "Login", render: () => <LoginPage /> };
export const LinkExpirado: Story = { name: "Link expirado", render: () => <ExpiredLinkPage isSignedIn={false} onLeave={fn()} /> };
export const RedefinirSenha: Story = { name: "Redefinir senha", render: () => <ResetPasswordPage email="marina@exemplo.com" /> };
export const Carregando: Story = { name: "Carregando", render: () => <LoadingPage /> };
export const EsqueletoDaPagina: Story = { name: "Esqueleto de página", render: () => <PageSkeletonScreen page="home" /> };
