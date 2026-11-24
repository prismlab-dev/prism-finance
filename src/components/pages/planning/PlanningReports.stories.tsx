import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import {
    SAMPLE_BALANCE_POINTS,
    SAMPLE_CARD_DATASET,
    SAMPLE_CARD_ROWS,
    SAMPLE_CARD_SCOPE,
    SAMPLE_INVOICE_MONTHS,
    SAMPLE_REPORTS_DATASET,
    SAMPLE_REPORT_PERIOD,
    SAMPLE_REPORT_SCOPE,
    SAMPLE_TODAY_DATE,
    SAMPLE_TOP_PURCHASES,
    SAMPLE_UPCOMING_INSTALLMENTS,
    SAMPLE_WALLET_DATASET,
    SAMPLE_WALLET_ROWS,
    SAMPLE_WALLET_SCOPE,
} from "../../../stories/mocks/sampleReports";
import { SAMPLE_BUDGET_TRANSACTIONS } from "../../../stories/mocks/sampleBudgets";
import { SAMPLE_SNAPSHOT } from "../../../stories/mocks/sampleFinance";
import { PlanningReportPeriodSelector } from "./PlanningReportPeriodSelector";
import { PlanningReportsAccountsSection } from "./PlanningReportsAccountsSection";
import { PlanningReportsBalanceSection } from "./PlanningReportsBalanceSection";
import { PlanningReportsCardView } from "./PlanningReportsCardView";
import { CategoryRow, PlanningReportsCategoryList } from "./PlanningReportsCategoryList";
import { PlanningReportsCategoryModal } from "./PlanningReportsCategoryModal";
import { PlanningReportsCombinedView } from "./PlanningReportsCombinedView";
import { PlanningReportsInstallmentsSection, PlanningReportsTopPurchasesSection } from "./PlanningReportsCommitmentsSection";
import { PlanningReportsEmptyState } from "./PlanningReportsEmptyState";
import { PlanningReportsFlowSection } from "./PlanningReportsFlowSection";
import { PlanningReportsInvoicesSection } from "./PlanningReportsInvoicesSection";
import { PlanningReportsLineSection } from "./PlanningReportsLineSection";
import { PlanningReportsMethodSection } from "./PlanningReportsMethodSection";
import { PlanningReportsOverviewSection } from "./PlanningReportsOverviewSection";
import { PlanningReportsPanel } from "./PlanningReportsPanel";
import { PlanningReportsRankingSection } from "./PlanningReportsRankingSection";
import { PlanningReportsScopeBar } from "./PlanningReportsScopeBar";
import { PlanningReportsTab } from "./PlanningReportsTab";
import { PlanningReportsWalletView } from "./PlanningReportsWalletView";
import type { ReportPeriod, ReportScope } from "./planningReportsUtils";

// Blocos da aba de Relatórios, montados com os construtores reais sobre os dados fictícios.
const meta = { title: "Componentes/Relatórios/Seções", parameters: { layout: "padded", route: "/reports" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const s = SAMPLE_SNAPSHOT;
const ds = SAMPLE_REPORTS_DATASET;
const tx = SAMPLE_BUDGET_TRANSACTIONS;

export const Painel: Story = { name: "PlanningReportsPanel", render: () => <PlanningReportsPanel title="Painel de exemplo" aside={<span className="text-xs text-white/50">aside</span>}><p className="text-sm text-white/70">Conteúdo do painel.</p></PlanningReportsPanel> };
export const EstadoVazio: Story = { name: "PlanningReportsEmptyState", render: () => <PlanningReportsEmptyState /> };
export const VisaoGeral: Story = { name: "PlanningReportsOverviewSection", render: () => <PlanningReportsOverviewSection summary={ds.summary} categoryReports={ds.categoryReports} /> };
export const Fluxo: Story = { name: "PlanningReportsFlowSection", render: () => <PlanningReportsFlowSection monthReports={ds.monthReports} transactions={tx} walletIds={SAMPLE_REPORT_SCOPE.walletIds} /> };
export const Metodos: Story = { name: "PlanningReportsMethodSection", render: () => <PlanningReportsMethodSection methodReports={ds.summary.methodReports} /> };
export const Ranking: Story = { name: "PlanningReportsRankingSection", render: () => <PlanningReportsRankingSection beneficiaryReports={ds.beneficiaryReports} /> };
export const ListaDeCategorias: Story = { name: "PlanningReportsCategoryList", render: () => <PlanningReportsCategoryList title="Despesas por categoria" emptyLabel="Sem despesas" categoryReports={ds.categoryReports} totalAmount={ds.summary.spending} showPaymentSplit /> };
export const LinhaDeCategoria: Story = {
    name: "CategoryRow",
    render: () => (
        <ul className="w-[520px] space-y-3">
            {ds.categoryReports.slice(0, 3).map((category) => <CategoryRow key={category.key} category={category} showPaymentSplit />)}
        </ul>
    ),
};
export const ModalDeCategorias: Story = { name: "PlanningReportsCategoryModal", render: () => <PlanningReportsCategoryModal title="Despesas por categoria" totalAmount={ds.summary.spending} categoryReports={ds.categoryReports} showPaymentSplit={false} /> };
export const Linha: Story = {
    name: "PlanningReportsLineSection",
    render: () => <PlanningReportsLineSection title="Saldo" color="#10B981" points={SAMPLE_BALANCE_POINTS.map((point) => ({ monthKey: point.monthKey, label: point.label, shortLabel: point.shortLabel, value: point.balance }))} />,
};
export const Saldo: Story = { name: "PlanningReportsBalanceSection", render: () => <PlanningReportsBalanceSection points={SAMPLE_BALANCE_POINTS} /> };
export const ContasCarteiras: Story = { name: "PlanningReportsAccountsSection — carteiras", render: () => <PlanningReportsAccountsSection kind="wallets" rows={SAMPLE_WALLET_ROWS} /> };
export const ContasCartoes: Story = { name: "PlanningReportsAccountsSection — cartões", render: () => <PlanningReportsAccountsSection kind="cards" rows={SAMPLE_CARD_ROWS} /> };
export const Faturas: Story = { name: "PlanningReportsInvoicesSection", render: () => <PlanningReportsInvoicesSection months={SAMPLE_INVOICE_MONTHS} /> };
export const Parcelas: Story = { name: "PlanningReportsInstallmentsSection", render: () => <PlanningReportsInstallmentsSection months={SAMPLE_UPCOMING_INSTALLMENTS} /> };
export const MaioresCompras: Story = { name: "PlanningReportsTopPurchasesSection", render: () => <PlanningReportsTopPurchasesSection purchases={SAMPLE_TOP_PURCHASES} /> };

export const VistaDeCarteiras: Story = { name: "PlanningReportsWalletView", render: () => <PlanningReportsWalletView dataset={SAMPLE_WALLET_DATASET} period={SAMPLE_REPORT_PERIOD} transactions={tx} creditCardInvoices={s.creditCardInvoices} wallets={s.wallets} /> };
export const VistaDeCartoes: Story = { name: "PlanningReportsCardView", render: () => <PlanningReportsCardView dataset={SAMPLE_CARD_DATASET} period={SAMPLE_REPORT_PERIOD} transactions={tx} creditCardInvoices={s.creditCardInvoices} creditCards={s.creditCards} today={SAMPLE_TODAY_DATE} /> };
export const VistaCombinada: Story = { name: "PlanningReportsCombinedView", render: () => <PlanningReportsCombinedView dataset={ds} transactions={tx} creditCardInvoices={s.creditCardInvoices} wallets={s.wallets} creditCards={s.creditCards} /> };

const tab = (scope: ReportScope) => <PlanningReportsTab period={SAMPLE_REPORT_PERIOD} scope={scope} transactions={tx} creditCardInvoices={s.creditCardInvoices} wallets={s.wallets} creditCards={s.creditCards} today={SAMPLE_TODAY_DATE} />;
export const AbaCombinada: Story = { name: "PlanningReportsTab — carteiras e cartões", render: () => tab(SAMPLE_REPORT_SCOPE) };
export const AbaCarteiras: Story = { name: "PlanningReportsTab — só carteiras", render: () => tab(SAMPLE_WALLET_SCOPE) };
export const AbaCartoes: Story = { name: "PlanningReportsTab — só cartões", render: () => tab(SAMPLE_CARD_SCOPE) };
export const AbaSemContas: Story = { name: "PlanningReportsTab — nenhuma conta", render: () => tab({ walletIds: [], creditCardIds: [] }) };

export const SeletorDePeriodo: Story = {
    name: "PlanningReportPeriodSelector",
    render: () => {
        const [period, setPeriod] = useState<ReportPeriod>(SAMPLE_REPORT_PERIOD);
        return <PlanningReportPeriodSelector period={period} onPeriodChange={setPeriod} />;
    },
};
export const BarraDeEscopo: Story = {
    name: "PlanningReportsScopeBar",
    render: () => {
        const [scope, setScope] = useState<ReportScope>(SAMPLE_REPORT_SCOPE);
        return <PlanningReportsScopeBar wallets={s.wallets} creditCards={s.creditCards} scope={scope} onScopeChange={setScope} trailing={<PlanningReportPeriodSelector period={SAMPLE_REPORT_PERIOD} onPeriodChange={fn()} />} />;
    },
};
