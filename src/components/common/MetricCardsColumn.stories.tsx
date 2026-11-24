import type { Meta, StoryObj } from "@storybook/react-vite";
import { MetricCardsColumn } from "./MetricCardsColumn";

const meta = {
    title: "Componentes/Comum/MetricCardsColumn",
    component: MetricCardsColumn,
    args: {
        cards: [
            { label: "Receitas", value: "R$ 7.800,00" },
            { label: "Despesas", value: "R$ 4.320,50" },
            { label: "Saldo", value: "R$ 3.479,50" },
        ],
    },
} satisfies Meta<typeof MetricCardsColumn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};
