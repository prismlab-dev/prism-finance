import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SegmentedControl, type SegmentedOption } from "./SegmentedControl";

type Status = "paid" | "pending";

const STATUS_OPTIONS: SegmentedOption<Status>[] = [
    { value: "paid", label: "Pago", activeClassName: "bg-emerald-500/20 text-emerald-200" },
    { value: "pending", label: "Pendente", activeClassName: "bg-amber-500/20 text-amber-200" },
];

const SORT_OPTIONS: SegmentedOption<string>[] = [
    { value: "priority", label: "Prioridade" },
    { value: "price", label: "Preço" },
    { value: "date", label: "Data" },
];

const meta = {
    title: "Componentes/UI/SegmentedControl",
    component: SegmentedControl<string>,
    args: { ariaLabel: "Opções", options: SORT_OPTIONS, value: "priority", onChange: () => undefined },
    argTypes: { variant: { control: "inline-radio", options: ["field", "compact", "pill", "tabs"] } },
} satisfies Meta<typeof SegmentedControl<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Field: Story = {
    render: () => {
        const [status, setStatus] = useState<Status>("paid");
        return (
            <div className="max-w-sm">
                <SegmentedControl ariaLabel="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
            </div>
        );
    },
};

export const Compact: Story = {
    render: () => {
        const [value, setValue] = useState("priority");
        return <SegmentedControl ariaLabel="Ordenar por" variant="compact" options={SORT_OPTIONS} value={value} onChange={setValue} />;
    },
};

export const Pill: Story = {
    render: () => {
        const [value, setValue] = useState("month");
        return (
            <SegmentedControl
                ariaLabel="Modo de data"
                variant="pill"
                options={[{ value: "month", label: "Mês" }, { value: "period", label: "Período" }]}
                value={value}
                onChange={setValue}
            />
        );
    },
};

export const Tabs: Story = {
    render: () => {
        const [value, setValue] = useState("income");
        return (
            <div className="max-w-sm">
                <SegmentedControl
                    ariaLabel="Tipo"
                    variant="tabs"
                    role="tab"
                    options={[
                        { value: "income", label: "Receitas", activeClassName: "border-emerald-300/40 bg-emerald-500/15 text-emerald-200" },
                        { value: "expense", label: "Despesas", activeClassName: "border-red-300/40 bg-red-500/15 text-red-200" },
                        { value: "all", label: "Todas" },
                    ]}
                    value={value}
                    onChange={setValue}
                />
            </div>
        );
    },
};

export const Disabled: Story = {
    render: () => <SegmentedControl ariaLabel="Status" options={STATUS_OPTIONS} value="paid" onChange={() => undefined} disabled />,
};
