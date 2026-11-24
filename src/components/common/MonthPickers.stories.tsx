import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { MonthGridPanel } from "./MonthGridPanel";
import { MonthPickerControl } from "./MonthPickerControl";
import { StatementMonthSelector } from "./StatementMonthSelector";
import { formatMonthLabel, getCurrentMonthKey, shiftMonth } from "../pages/statement/statementPageShared";

// Os três seletores de mês do app, lado a lado.
const meta = { title: "Componentes/Comum/Seletores de mês" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Grid() {
    const [month, setMonth] = useState(getCurrentMonthKey());
    return (
        <div className="w-72">
            <MonthGridPanel selectedMonth={month} onMonthChange={setMonth} />
        </div>
    );
}

function Control() {
    const [month, setMonth] = useState(getCurrentMonthKey());
    return <MonthPickerControl selectedMonth={month} onMonthChange={setMonth} formatMonthLabel={formatMonthLabel} shiftMonth={shiftMonth} />;
}

function Statement() {
    const [month, setMonth] = useState(getCurrentMonthKey());
    return <StatementMonthSelector selectedMonth={month} onMonthChange={setMonth} />;
}

export const PainelDeMeses: Story = { name: "MonthGridPanel", render: () => <Grid /> };
export const ControleDeMes: Story = { name: "MonthPickerControl", render: () => <Control /> };
export const SeletorDeFatura: Story = { name: "StatementMonthSelector", render: () => <Statement /> };
