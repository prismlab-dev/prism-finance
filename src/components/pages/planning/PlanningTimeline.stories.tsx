import type { Meta, StoryObj } from "@storybook/react-vite";
import { Gift } from "lucide-react";
import { useState } from "react";
import { fn } from "storybook/test";
import { SAMPLE_PLANNING_SUMMARY, SAMPLE_TODAY_DATE } from "../../../stories/mocks/sampleReports";
import { SAMPLE_SNAPSHOT } from "../../../stories/mocks/sampleFinance";
import { CreditCardOptionContent } from "./CreditCardOptionContent";
import { PlanningAlertsPanel } from "./PlanningAlertsPanel";
import { PlanningControlGroup } from "./PlanningControlGroup";
import { PlanningDetailsAside } from "./PlanningDetailsAside";
import { PlanningDetailsHeader } from "./PlanningDetailsHeader";
import { PlanningDetailsSection } from "./PlanningDetailsSection";
import { PlanningFiltersPanel } from "./PlanningFiltersPanel";
import { PlanningListRow } from "./PlanningListRow";
import { PlanningMonthCard } from "./PlanningMonthCard";
import { PlanningPageHeader } from "./PlanningPageHeader";
import { PlanningProjectionContextMenu } from "./PlanningProjectionContextMenu";
import { PlanningSimulatorPanel } from "./PlanningSimulatorPanel";
import { PlanningSummaryCards } from "./PlanningSummaryCards";
import { PlanningTimelinePanel } from "./PlanningTimelinePanel";
import { PlanningTimelineSection } from "./PlanningTimelineSection";
import { PlanningTimelineTable } from "./PlanningTimelineTable";
import { PlanningTimelineToolbar, WalletOptionContent } from "./PlanningTimelineToolbar";
import { PlanningToggleRow } from "./PlanningToggleRow";
import { buildPlanningProjectionContextActions } from "./planningProjectionContextActions";
import type { PlanningPanel } from "./planningTimelineTypes";
import { usePlanningPage } from "./usePlanningPage";

// Linha do tempo do planejamento. As peças com dados usam o mesmo hook da página (`usePlanningPage`) sobre os dados fictícios.
const meta = { title: "Componentes/Planejamento/Linha do tempo", parameters: { layout: "padded", route: "/planning" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const s = SAMPLE_SNAPSHOT;

function Harness({ children }: { children: (page: ReturnType<typeof usePlanningPage>) => React.ReactNode }) {
    return <>{children(usePlanningPage())}</>;
}

export const Cabecalho: Story = { name: "PlanningPageHeader", render: () => <PlanningPageHeader toolbar={<span className="text-sm text-white/60">toolbar</span>} /> };

export const BarraDeFerramentas: Story = {
    name: "PlanningTimelineToolbar",
    render: () => {
        const [compare, setCompare] = useState(false);
        const [horizontal, setHorizontal] = useState(false);
        const [months, setMonths] = useState(9);
        const [walletIds, setWalletIds] = useState(s.wallets.map((wallet) => wallet.id));
        const [cardIds, setCardIds] = useState(s.creditCards.map((card) => card.id));
        return (
            <PlanningTimelineToolbar compareMode={compare} horizontalMode={horizontal} timelineMonthCount={months} wallets={s.wallets} creditCards={s.creditCards}
                selectedWalletIds={walletIds} selectedCreditCardIds={cardIds} onCompareModeChange={setCompare} onHorizontalModeChange={setHorizontal}
                onSelectedWalletIdsChange={setWalletIds} onSelectedCreditCardIdsChange={setCardIds} onTimelineMonthCountChange={setMonths} />
        );
    },
};

export const LinhaDoTempo: Story = {
    name: "PlanningTimelinePanel",
    render: () => (
        <Harness>{(page) => (
            <div className="h-[560px]"><PlanningTimelinePanel months={page.projection.months} selectedMonthKey={page.selectedMonth?.monthKey ?? null} selectedPanel={page.selectedPanel} compareMode={false} horizontalMode={false} onSelectPanel={page.handleSelectPanel} /></div>
        )}</Harness>
    ),
};
export const LinhaDoTempoHorizontal: Story = {
    name: "PlanningTimelinePanel — horizontal e comparação",
    render: () => (
        <Harness>{(page) => (
            <div className="h-[560px]"><PlanningTimelinePanel months={page.projection.months} selectedMonthKey={page.selectedMonth?.monthKey ?? null} selectedPanel={page.selectedPanel} compareMode horizontalMode onSelectPanel={page.handleSelectPanel} /></div>
        )}</Harness>
    ),
};
export const Tabela: Story = {
    name: "PlanningTimelineTable",
    render: () => (
        <Harness>{(page) => <PlanningTimelineTable months={page.projection.months} selectedMonthKey={page.selectedMonth?.monthKey ?? null} selectedPanel={page.selectedPanel} compareMode={false} onSelectPanel={page.handleSelectPanel} />}</Harness>
    ),
};
export const CartaoDoMes: Story = {
    name: "PlanningMonthCard",
    render: () => (
        <Harness>{(page) => page.currentMonth ? <div className="w-80"><PlanningMonthCard month={page.currentMonth} index={0} compareMode={false} isSelected selectedPanel="projections" onSelectPanel={fn()} /></div> : null}</Harness>
    ),
};
export const SecaoDaLinha: Story = {
    name: "PlanningTimelineSection",
    render: () => <div className="w-80"><PlanningTimelineSection title="Receitas" active onSelect={fn()} countLabel="3 itens" icon={<Gift size={14} />} total={7800} totalLabel="Total" visibleItemCount={3} /></div>,
};

export const Detalhes: Story = {
    name: "PlanningDetailsAside",
    render: () => (
        <Harness>{(page) => (
            <div className="h-[640px] w-[420px]">
                <PlanningDetailsAside selectedMonth={page.selectedMonth} fallbackMonth={page.currentMonth} selectedPanel={page.selectedPanel as PlanningPanel} activeWishItems={page.activeWishItems}
                    wishlistSelectionByWishItemId={page.wishlistSelectionByWishItemId} onAddIncome={fn()} onDeleteExpense={fn()} onDeleteIncome={fn()} onEditExpense={fn()} onEditIncome={fn()}
                    onEditWishlistItem={fn()} onOpenTransaction={fn()} onOpenInvoice={fn()} onMoveInvoice={fn()} onRestoreInvoiceMonth={fn()} onToggleExpense={fn()} onToggleIncome={fn()}
                    onToggleSimulatedIncome={fn()} onToggleInheritedExpense={fn()} onToggleWishlistSelection={fn()} />
            </div>
        )}</Harness>
    ),
};
export const DetalhesCabecalho: Story = {
    name: "PlanningDetailsHeader",
    render: () => (
        <Harness>{(page) => <div className="w-[420px]"><PlanningDetailsHeader title="Receitas" monthLabel={page.currentMonth?.monthLabel ?? ""} panel="income" month={page.currentMonth} onAddIncome={fn()} /></div>}</Harness>
    ),
};
export const DetalhesSecao: Story = {
    name: "PlanningDetailsSection",
    render: () => <div className="w-80"><PlanningDetailsSection title="Despesas herdadas" tone="expense"><p className="text-sm text-white/70">Itens da seção</p></PlanningDetailsSection></div>,
};
export const LinhaDeLista: Story = {
    name: "PlanningListRow",
    render: () => (
        <div className="w-80 space-y-1">
            <PlanningListRow label="Salário" amount={7800} iconName="briefcase" iconTone="income" onClick={fn()} />
            <PlanningListRow label="Aluguel" amount={-2100} iconName="house" iconTone="expense" onClick={fn()} />
            <PlanningListRow label="Notebook (desejo)" amount={-2800} iconName={null} iconTone="wishlist" customIcon={Gift} active={false} />
        </div>
    ),
};
export const LinhaComChave: Story = {
    name: "PlanningToggleRow",
    render: () => (
        <div className="w-80 space-y-1">
            <PlanningToggleRow active amount={7800} label="Salário" iconTone="income" iconName="briefcase" toggleId="a" onToggle={fn()} />
            <PlanningToggleRow active={false} amount={-320} label="Streaming" iconTone="expense" iconName="music" toggleId="b" onToggle={fn()} />
        </div>
    ),
};
export const MenuDaProjecao: Story = {
    name: "PlanningProjectionContextMenu",
    parameters: { layout: "fullscreen" },
    render: () => <PlanningProjectionContextMenu state={{ itemId: "x", x: 80, y: 40 }} actions={buildPlanningProjectionContextActions({ itemType: "expense", isActive: true, canMove: true })} onSelect={fn()} onClose={fn()} />,
};
export const GrupoDeControles: Story = { name: "PlanningControlGroup", render: () => <PlanningControlGroup label="Visão"><span className="text-sm">Controles agrupados</span></PlanningControlGroup> };
export const FiltroDeMes: Story = {
    name: "PlanningFiltersPanel",
    render: () => {
        const [month, setMonth] = useState(SAMPLE_PLANNING_SUMMARY.selectedMonth);
        return <PlanningFiltersPanel selectedMonth={month} onMonthChange={setMonth} />;
    },
};
export const Resumo: Story = { name: "PlanningSummaryCards", render: () => <PlanningSummaryCards summary={SAMPLE_PLANNING_SUMMARY} /> };
export const Alertas: Story = { name: "PlanningAlertsPanel", render: () => <PlanningAlertsPanel summary={SAMPLE_PLANNING_SUMMARY} /> };
export const Simulador: Story = {
    name: "PlanningSimulatorPanel",
    render: () => (
        <PlanningSimulatorPanel amountInput="1200" paymentMethod="credit_card" walletId={s.wallets[0].id} creditCardId={s.creditCards[0].id} purchaseDate={SAMPLE_TODAY_DATE} installments={3}
            wallets={s.wallets} creditCards={s.creditCards} simulation={SAMPLE_PLANNING_SUMMARY.simulation} onAmountInputChange={fn()} onPaymentMethodChange={fn()} onWalletIdChange={fn()}
            onCreditCardIdChange={fn()} onPurchaseDateChange={fn()} onInstallmentsChange={fn()} onResetSimulation={fn()} />
    ),
};
export const OpcoesDoPlanejamento: Story = {
    name: "CreditCardOptionContent e WalletOptionContent",
    render: () => (
        <div className="w-64 space-y-2 text-sm">
            <CreditCardOptionContent option={{ id: s.creditCards[0].id, label: s.creditCards[0].name, searchText: "", creditCard: s.creditCards[0] }} />
            <WalletOptionContent option={{ id: s.wallets[0].id, label: s.wallets[0].name, searchText: "", wallet: s.wallets[0] }} />
        </div>
    ),
};
