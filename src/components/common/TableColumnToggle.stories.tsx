import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { TableColumnToggleBar, TableColumnToggleButton } from "./TableColumnToggleButton";
import { ColumnResizeHandle } from "./ColumnResizeHandle";

const meta = { title: "Componentes/Comum/Colunas de tabela" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Key = "date" | "description" | "category" | "amount";
const LABELS: Record<Key, string> = { date: "Data", description: "Descrição", category: "Categoria", amount: "Valor" };

function Bar() {
    const [order, setOrder] = useState<Key[]>(["date", "description", "category", "amount"]);
    const [hidden, setHidden] = useState<Key[]>(["category"]);
    return (
        <TableColumnToggleBar
            columns={order.map((key) => ({ key, label: LABELS[key], active: !hidden.includes(key) }))}
            order={order}
            onToggle={(key) => setHidden((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))}
            onOrderChange={setOrder}
        />
    );
}

export const BotaoAtivo: Story = { name: "TableColumnToggleButton — ativo", render: () => <TableColumnToggleButton label="Descrição" active onClick={fn()} /> };
export const BotaoInativo: Story = { name: "TableColumnToggleButton — inativo", render: () => <TableColumnToggleButton label="Categoria" active={false} onClick={fn()} /> };
export const BarraReordenavel: Story = { name: "TableColumnToggleBar", render: () => <Bar /> };
export const AlcaDeRedimensionar: Story = {
    name: "ColumnResizeHandle",
    render: () => (
        <div className="relative h-16 w-64 rounded-lg border border-white/[0.12]">
            <ColumnResizeHandle onWidthChange={fn()} onReset={fn()} />
        </div>
    ),
};
