import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { SAMPLE_SNAPSHOT, SAMPLE_TRANSACTIONS } from "../../../stories/mocks/sampleFinance";
import { StatementContentPanel } from "./StatementContentPanel";
import { StatementFiltersPanel } from "./StatementFiltersPanel";
import { StatementOverviewPanel } from "./StatementOverviewPanel";
import { StatementSummaryCards } from "./StatementSummaryCards";
import { getCurrentMonthKey, type StatementSummary } from "./statementPageShared";

const meta = { title: "Componentes/Extrato/Painéis", parameters: { layout: "padded", route: "/statement" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const s = SAMPLE_SNAPSHOT;
const month = getCurrentMonthKey();
const card = s.creditCards[0];
const invoices = s.creditCardInvoices.filter((invoice) => invoice.creditCardId === card.id);
const cardById = new Map(s.creditCards.map((item) => [item.id, item]));
const invoiceById = new Map(s.creditCardInvoices.map((item) => [item.id, item]));

const summary: StatementSummary = {
    selectedMonth: month,
    selectedCardName: card.name,
    invoiceCountInMonth: 1,
    transactionCountInMonth: 6,
    spentInMonth: 1980,
    openInMonth: 1380,
    paidInMonth: 600,
    limitTotalScope: card.limit,
    openAmountScope: 1980,
    availableLimitEstimate: card.limit - 1980,
    statusDistribution: { open: 1, future: 0, closed: 0, overdue: 0, paid: 0 },
    focusedInvoice: { cycleKey: month, dueDate: `${month}-17`, closingDate: `${month}-10`, status: "open", openAmount: 1380, cardName: card.name },
};

export const Resumo: Story = { name: "StatementSummaryCards", render: () => <StatementSummaryCards summary={summary} /> };

export const Filtros: Story = {
    name: "StatementFiltersPanel",
    render: () => {
        const [selectedMonth, setMonth] = useState(month);
        const [selectedCardId, setCard] = useState(card.id);
        return <StatementFiltersPanel selectedMonth={selectedMonth} selectedCardId={selectedCardId} creditCards={s.creditCards} onMonthChange={setMonth} onCardChange={setCard} />;
    },
};

export const VisaoGeral: Story = {
    name: "StatementOverviewPanel",
    render: () => {
        const [selectedMonth, setMonth] = useState(month);
        const [cardIds, setCardIds] = useState([card.id]);
        return (
            <StatementOverviewPanel creditCards={s.creditCards} selectedCardIds={cardIds} onCardIdsChange={setCardIds} selectedMonth={selectedMonth} currentInvoiceMonth={month}
                onMonthChange={setMonth} summary={summary} invoices={invoices} cardById={cardById} onPayInvoice={fn()} onInvoiceStateAdjustment={fn()} />
        );
    },
};

export const Conteudo: Story = {
    name: "StatementContentPanel",
    render: () => (
        <StatementContentPanel selectedMonth={month} transactions={SAMPLE_TRANSACTIONS.filter((transaction) => transaction.creditCardId === card.id)} cardById={cardById} invoiceById={invoiceById} onAction={fn()} />
    ),
};
