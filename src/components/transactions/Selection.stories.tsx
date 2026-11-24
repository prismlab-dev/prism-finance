import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { BulkHeaderCheckbox, BulkRowCheckbox, FloatingTransactionBulkFooter } from "./TransactionBulkSelectionControls";
import { TransactionContextMenu } from "./TransactionContextMenu";
import { TransactionDetailIndicators } from "./TransactionDetailIndicators";

// Seleção em massa, menu de contexto e indicadores das linhas de transação.
const meta = { title: "Componentes/Formulários/Seleção e menu de contexto" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const CaixasDeSelecao: Story = {
    name: "BulkHeaderCheckbox e BulkRowCheckbox",
    render: () => (
        <div className="flex items-center gap-6">
            <BulkHeaderCheckbox checked={false} indeterminate={false} onChange={fn()} />
            <BulkHeaderCheckbox checked={false} indeterminate onChange={fn()} />
            <BulkHeaderCheckbox checked indeterminate={false} onChange={fn()} />
            <BulkRowCheckbox checked={false} onChange={fn()} />
            <BulkRowCheckbox checked onChange={fn()} />
            <BulkRowCheckbox checked={false} disabled onChange={fn()} />
        </div>
    ),
};

export const BarraDeAcoesEmMassa: Story = {
    name: "FloatingTransactionBulkFooter",
    parameters: { layout: "fullscreen" },
    render: () => (
        <div className="relative h-40">
            <FloatingTransactionBulkFooter selectedCount={3} selectedAmount="R$ 1.420,00" onEdit={fn()} onMarkAsPaid={fn()} onPayToday={fn()} onClear={fn()} />
        </div>
    ),
};

export const MenuDeContexto: Story = {
    name: "TransactionContextMenu",
    parameters: { layout: "fullscreen" },
    render: () => (
        <TransactionContextMenu
            state={{ transactionId: "tx-1", x: 80, y: 40 }}
            onSelect={fn()}
            onClose={fn()}
            actions={[
                { id: "open", label: "Abrir" },
                { id: "view_series", label: "Visualizar série" },
                { id: "toggle_status", label: "Marcar como pago", nextStatus: "paid" },
                { id: "duplicate", label: "Duplicar" },
                { id: "delete_single", label: "Excluir esta", tone: "danger", scope: "single" },
                { id: "delete_all", label: "Excluir todas", tone: "danger", scope: "all" },
            ]}
        />
    ),
};

export const IndicadoresDeDetalhes: Story = {
    name: "TransactionDetailIndicators",
    render: () => (
        <div className="flex items-center gap-6">
            <TransactionDetailIndicators transactionId="tx-1" flags={{ annotations: new Map([["tx-1", "Pago em dinheiro"]]), attachmentNames: new Map([["tx-1", ["nota.pdf"]]]) }} />
            <TransactionDetailIndicators transactionId="tx-2" flags={{ annotations: new Map(), attachmentNames: new Map([["tx-2", ["a.pdf", "b.png"]]]) }} />
            <TransactionDetailIndicators transactionId="tx-3" flags={null} />
        </div>
    ),
};
