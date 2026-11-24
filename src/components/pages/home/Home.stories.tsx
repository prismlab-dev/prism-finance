import type { Meta, StoryObj } from "@storybook/react-vite";
import { SAMPLE_TRANSACTIONS } from "../../../stories/mocks/sampleFinance";
import { BalancoMensal } from "./charts/BalancoMensal";
import { GastosPorCategoria } from "./charts/GastosPorCategoria";
import { CreditCardInvoicesCard } from "./CreditCardInvoicesCard";
import { RecentTransactionsPanel } from "./RecentTransactionsPanel";
import { MiniTransactionBlock } from "./SmTransactionBlock";
import { SpendingBillsAlertCard } from "./SpendingBillsAlertCard";
import { UpcomingPanel } from "./UpcomingPanel";
import { WealthCard } from "./WealthCard";

// Cartões e gráficos da tela inicial.
const meta = { title: "Componentes/Início/Cartões e gráficos", parameters: { layout: "padded" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Patrimonio: Story = { name: "WealthCard", render: () => <div className="w-96"><WealthCard /></div> };
export const FaturasDosCartoes: Story = { name: "CreditCardInvoicesCard", render: () => <div className="w-96"><CreditCardInvoicesCard /></div> };
export const AlertaDeContas: Story = { name: "SpendingBillsAlertCard", render: () => <div className="w-96"><SpendingBillsAlertCard transactions={SAMPLE_TRANSACTIONS} /></div> };
export const Proximos: Story = { name: "UpcomingPanel", render: () => <div className="w-96"><UpcomingPanel transactions={SAMPLE_TRANSACTIONS} /></div> };
export const Recentes: Story = { name: "RecentTransactionsPanel", render: () => <div className="w-96"><RecentTransactionsPanel transactions={SAMPLE_TRANSACTIONS.slice(0, 8)} /></div> };
export const BlocoMini: Story = {
    name: "MiniTransactionBlock",
    render: () => <div className="w-80 space-y-2"><MiniTransactionBlock transaction={SAMPLE_TRANSACTIONS[0]} /><MiniTransactionBlock transaction={SAMPLE_TRANSACTIONS[2]} showSign={false} /></div>,
};
export const BalancoDoMes: Story = { name: "BalancoMensal", render: () => <div className="h-72 w-[520px]"><BalancoMensal /></div> };
export const GastosDaCategoria: Story = { name: "GastosPorCategoria", render: () => <div className="h-80 w-[520px]"><GastosPorCategoria /></div> };
