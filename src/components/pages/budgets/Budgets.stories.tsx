import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { SAMPLE_BUDGETS_OVERVIEW, SAMPLE_BUDGET_NAME_BY_ID, SAMPLE_MONTH_KEY, SAMPLE_MONTH_LABEL, SAMPLE_RULE_OPTIONS, SAMPLE_RULE_RESOLVER, previewSampleRules } from "../../../stories/mocks/sampleBudgets";
import { SAMPLE_SNAPSHOT } from "../../../stories/mocks/sampleFinance";
import type { PlanningBudgetRule } from "../../../context/FinanceContext";
import { BudgetCard } from "./BudgetCard";
import { BudgetDetailHero } from "./BudgetDetailHero";
import { BudgetDetailView } from "./BudgetDetailView";
import { BudgetEntriesTimeline } from "./BudgetEntriesTimeline";
import { BudgetHistoryChart } from "./BudgetHistoryChart";
import { BudgetProgressBar } from "./BudgetProgressBar";
import { BudgetRuleField } from "./BudgetRuleField";
import { BudgetRulesPreviewPanel } from "./BudgetRulesPreviewPanel";
import { BudgetTransactionRow } from "./BudgetTransactionRow";
import { BudgetsEmptyState } from "./BudgetsEmptyState";
import { BudgetsOverviewPanel } from "./BudgetsOverviewPanel";
import { BudgetsToolbar } from "./BudgetsToolbar";
import type { BudgetRuleTone } from "./BudgetRuleField";

const meta = { title: "Componentes/Orçamentos/Peças", parameters: { layout: "padded", route: "/budgets" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const progress = SAMPLE_BUDGETS_OVERVIEW.progresses[0];
const entry = progress.entries[0];

export const Cartao: Story = {
    name: "BudgetCard",
    render: () => (
        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
            {SAMPLE_BUDGETS_OVERVIEW.progresses.map((item, index) => (
                <BudgetCard key={item.budget.id} progress={item} name={SAMPLE_BUDGET_NAME_BY_ID.get(item.budget.id) ?? item.budget.name} iconName="shopping-cart" color="#F97316" index={index} onOpen={fn()} />
            ))}
        </div>
    ),
};
export const BarraDeProgresso: Story = {
    name: "BudgetProgressBar",
    render: () => <div className="w-80"><BudgetProgressBar progress={progress} /></div>,
};
export const Destaque: Story = {
    name: "BudgetDetailHero",
    render: () => <BudgetDetailHero progress={progress} color="#F97316" paceRatio={0.6} />,
};
export const Historico: Story = {
    name: "BudgetHistoryChart",
    render: () => <div className="h-64 w-[560px]"><BudgetHistoryChart history={progress.history} cap={progress.budget.amount} color="#F97316" /></div>,
};
export const LinhaDoTempo: Story = {
    name: "BudgetEntriesTimeline",
    render: () => (
        <div className="w-[560px]">
            <BudgetEntriesTimeline entries={progress.entries} cap={progress.budget.amount} color="#F97316" resolveSourceLabel={() => "Cartão Roxo"} budgetNameById={SAMPLE_BUDGET_NAME_BY_ID} onOpenTransaction={fn()} />
        </div>
    ),
};
export const LinhaDeTransacao: Story = {
    name: "BudgetTransactionRow",
    render: () => (
        <div className="w-[520px] space-y-2">
            <BudgetTransactionRow entry={entry} sourceLabel="Cartão Roxo" alsoInLabels={["Lazer e restaurantes"]} onOpen={fn()} />
            <BudgetTransactionRow entry={{ ...entry, isForecast: true }} sourceLabel={null} />
        </div>
    ),
};
export const PainelDeVisaoGeral: Story = {
    name: "BudgetsOverviewPanel",
    render: () => <BudgetsOverviewPanel overview={SAMPLE_BUDGETS_OVERVIEW} nameOf={(id) => SAMPLE_BUDGET_NAME_BY_ID.get(id) ?? "Orçamento"} colorOf={() => "#F97316"} onOpen={fn()} />,
};
export const BarraDeFerramentas: Story = {
    name: "BudgetsToolbar",
    render: () => {
        const [month, setMonth] = useState(SAMPLE_MONTH_KEY);
        return <BudgetsToolbar monthKey={month} onMonthChange={setMonth} onCreate={fn()} />;
    },
};
export const EstadoVazio: Story = { name: "BudgetsEmptyState", render: () => <BudgetsEmptyState onCreate={fn()} /> };

export const CampoDeRegras: Story = {
    name: "BudgetRuleField",
    render: () => {
        const [include, setInclude] = useState<PlanningBudgetRule[]>([{ kind: "category", categoryId: "system-category-expense-food-market" }]);
        const [exclude, setExclude] = useState<PlanningBudgetRule[]>([]);
        const same = (a: PlanningBudgetRule, b: PlanningBudgetRule) => JSON.stringify(a) === JSON.stringify(b);
        return (
            <div className="w-[520px]">
                <BudgetRuleField
                    include={include}
                    exclude={exclude}
                    options={SAMPLE_RULE_OPTIONS}
                    labelOf={SAMPLE_RULE_RESOLVER.labelOf}
                    onAdd={(tone: BudgetRuleTone, rule) => (tone === "include" ? setInclude((current) => [...current, rule]) : setExclude((current) => [...current, rule]))}
                    onRemove={(tone: BudgetRuleTone, rule) => (tone === "include" ? setInclude((current) => current.filter((item) => !same(item, rule))) : setExclude((current) => current.filter((item) => !same(item, rule))))}
                />
            </div>
        );
    },
};
export const PreviaDasRegras: Story = {
    name: "BudgetRulesPreviewPanel",
    render: () => (
        <div className="w-[420px]">
            <BudgetRulesPreviewPanel preview={previewSampleRules({ include: SAMPLE_SNAPSHOT.planning.budgets[0].include, exclude: [] })} monthLabel={SAMPLE_MONTH_LABEL} budgetNameById={SAMPLE_BUDGET_NAME_BY_ID} />
        </div>
    ),
};
export const DetalheDoOrcamento: Story = {
    name: "BudgetDetailView",
    parameters: { layout: "fullscreen" },
    render: () => (
        <BudgetDetailView progress={progress} name="Mercado" iconName="shopping-cart" color="#F97316" monthKey={SAMPLE_MONTH_KEY} onMonthChange={fn()} budgetNameById={SAMPLE_BUDGET_NAME_BY_ID} onBack={fn()} onEdit={fn()} onDelete={fn()} />
    ),
};
