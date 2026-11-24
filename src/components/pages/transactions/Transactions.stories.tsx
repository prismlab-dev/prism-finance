import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { SAMPLE_SNAPSHOT, SAMPLE_TRANSACTIONS } from "../../../stories/mocks/sampleFinance";
import { TransactionsFiltersPanel } from "./TransactionsFiltersPanel";
import { TransactionsListPanel } from "./TransactionsListPanel";
import { TransactionsOverviewPanel } from "./TransactionsOverviewPanel";
import type { SortMode, TransactionsDateMode, TransactionsSummary, TransactionsTabKey } from "./transactionsPageShared";

const meta = { title: "Componentes/Transações/Painéis", parameters: { layout: "padded", route: "/transactions" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const s = SAMPLE_SNAPSHOT;
const monthKey = new Date().toISOString().slice(0, 7);
const summary: TransactionsSummary = { paid: { count: 12, amount: 6420.5 }, pending: { count: 5, amount: 2210 }, total: { count: 17, amount: 8630.5 } };
const byType = (type: string) => SAMPLE_TRANSACTIONS.filter((transaction) => transaction.type === type);

export const VisaoGeral: Story = {
    name: "TransactionsOverviewPanel",
    render: () => {
        const [walletIds, setWalletIds] = useState<string[]>([]);
        const [tab, setTab] = useState<TransactionsTabKey>("spending");
        const [mode, setMode] = useState<TransactionsDateMode>("month");
        const [month, setMonth] = useState(monthKey);
        const [from, setFrom] = useState(`${monthKey}-01`);
        const [to, setTo] = useState(`${monthKey}-28`);
        return (
            <TransactionsOverviewPanel wallets={s.wallets} selectedWalletIds={walletIds} onWalletIdsChange={setWalletIds} activeTab={tab} onTypeSelect={setTab}
                dateMode={mode} onDateModeChange={setMode} selectedMonth={month} onMonthChange={setMonth} dateFrom={from} dateTo={to} onDateFromChange={setFrom} onDateToChange={setTo} summary={summary} />
        );
    },
};

export const Filtros: Story = {
    name: "TransactionsFiltersPanel",
    render: () => {
        const [advanced, setAdvanced] = useState(true);
        const [query, setQuery] = useState("");
        return (
            <TransactionsFiltersPanel
                showAdvancedFilters={advanced}
                searchQuery={query}
                selectedCategoryKey=""
                selectedBeneficiary=""
                selectedStatus=""
                selectedTagIds={[]}
                minAmount=""
                maxAmount=""
                categoryOptions={s.categories.filter((category) => category.type === "expense").map((category) => ({ value: category.id, label: category.name, level: category.parentId ? 1 : 0 }))}
                beneficiaryOptions={s.beneficiaries.map((beneficiary) => beneficiary.name)}
                tagOptions={s.tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color }))}
                hasAdvancedFilters={false}
                onToggleAdvancedFilters={() => setAdvanced((current) => !current)}
                onClearAdvancedFilters={fn()}
                onSearchQueryChange={setQuery}
                onCategoryChange={fn()}
                onBeneficiaryChange={fn()}
                onStatusChange={fn()}
                onMinAmountChange={fn()}
                onMaxAmountChange={fn()}
                onTagToggle={fn()}
            />
        );
    },
};

export const Lista: Story = {
    name: "TransactionsListPanel",
    render: () => {
        const [sortMode, setSortMode] = useState<SortMode>("date-desc");
        return (
            <TransactionsListPanel activeTab="spending" incomeTransactions={byType("income")} spendingTransactions={byType("spending")} transferTransactions={byType("transfer")}
                wallets={s.wallets} selectedMonth={monthKey} sortMode={sortMode} onSortModeChange={setSortMode} onAction={fn()} />
        );
    },
};

export const ListaDeReceitas: Story = {
    name: "TransactionsListPanel — receitas",
    render: () => (
        <TransactionsListPanel activeTab="income" incomeTransactions={byType("income")} spendingTransactions={[]} transferTransactions={[]} wallets={s.wallets} selectedMonth={monthKey} sortMode="date-desc" onSortModeChange={fn()} onAction={fn()} />
    ),
};
