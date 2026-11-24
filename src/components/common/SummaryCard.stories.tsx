import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowDownRight, ArrowUpRight, TriangleAlert, Wallet } from "lucide-react";
import { SummaryCard, SummaryCardsGrid } from "./SummaryCard";

const meta = {
    title: "Componentes/Comum/SummaryCard",
    component: SummaryCard,
    args: { id: "income", title: "Receitas", value: "R$ 7.800,00", tone: "positive", icon: ArrowUpRight, helper: "3 lançamentos neste mês" },
    argTypes: { tone: { control: "inline-radio", options: ["positive", "negative", "warning", "neutral"] } },
} satisfies Meta<typeof SummaryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Positivo: Story = {};
export const Negativo: Story = { args: { id: "expense", title: "Despesas", value: "R$ 4.320,50", tone: "negative", icon: ArrowDownRight } };
export const Atencao: Story = { args: { id: "pending", title: "A pagar", value: "R$ 1.280,00", tone: "warning", icon: TriangleAlert, badge: 4 } };
export const Neutro: Story = { args: { id: "balance", title: "Saldo", value: "R$ 3.479,50", tone: "neutral", icon: Wallet } };

export const Grade: Story = {
    render: () => (
        <SummaryCardsGrid
            cards={[
                { id: "a", title: "Receitas", value: "R$ 7.800,00", tone: "positive", icon: ArrowUpRight },
                { id: "b", title: "Despesas", value: "R$ 4.320,50", tone: "negative", icon: ArrowDownRight },
                { id: "c", title: "A pagar", value: "R$ 1.280,00", tone: "warning", icon: TriangleAlert, badge: 4 },
                { id: "d", title: "Saldo", value: "R$ 3.479,50", tone: "neutral", icon: Wallet },
            ]}
        />
    ),
};
