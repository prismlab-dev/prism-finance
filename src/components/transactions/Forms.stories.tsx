import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { SAMPLE_SNAPSHOT, SAMPLE_TRANSACTIONS } from "../../stories/mocks/sampleFinance";
import { CardSpendingForm } from "./CardSpendingForm";
import {
    BeneficiaryOptionContent as CardBeneficiaryOption,
    CategoryOptionContent as CardCategoryOption,
    CreditCardOptionContent,
    EditScopeOptionContent,
    EDIT_SCOPE_OPTIONS,
    EditScopeSelectedContent,
    TagOptionContent as CardTagOption,
} from "./CardSpendingOptions";
import { buildInstallmentPreview, type InstallmentPlan } from "./installmentPreview";
import { InstallmentAmountHint } from "./InstallmentAmountHint";
import { InstallmentPlanWarning } from "./InstallmentPlanWarning";
import { InstallmentPreviewAside, InstallmentPreviewPanel } from "./InstallmentPreviewPanel";
import { InvoiceOptionContent } from "./InvoiceOptionContent";
import { FormActionButtons } from "./SaveAndContinue";
import { TransactionDetailsField } from "./TransactionDetailsField";
import { TransactionForm } from "./TransactionForm";
import { TransactionFormFields } from "./TransactionFormFields";
import { useTransactionDetails } from "./useTransactionDetails";
import { useTransactionForm } from "./useTransactionForm";
import {
    BeneficiaryOptionContent,
    CategoryOptionContent,
    TagOptionContent,
    TransactionHeader,
    WalletOptionContent,
} from "./TransactionFormParts";
import { TransferForm } from "./TransferForm";
import { AnimatedTransactionFormPanel } from "./AnimatedTransactionFormPanel";
import { buildCardInvoiceOptions } from "./cardInvoiceOptions";
import type { TransactionDetailsController } from "./useTransactionDetails";

// Formulários de lançamento e as peças que os compõem.
const meta = { title: "Componentes/Formulários/Lançamento", parameters: { layout: "padded" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const modalFrame = (children: React.ReactNode) => <div className="h-[680px] w-[520px] max-w-full">{children}</div>;

export const DespesaNova: Story = { name: "TransactionForm — despesa", render: () => modalFrame(<TransactionForm type="spending" />) };
export const ReceitaNova: Story = { name: "TransactionForm — receita", render: () => modalFrame(<TransactionForm type="income" />) };
export const DespesaAvancada: Story = { name: "TransactionForm — aba avançada", render: () => modalFrame(<TransactionForm type="spending" activeTab="advanced" />) };
export const EdicaoDeTransacao: Story = { name: "TransactionForm — editando", render: () => modalFrame(<TransactionForm transaction={SAMPLE_TRANSACTIONS[2]} />) };
export const Transferencia: Story = { name: "TransferForm", render: () => modalFrame(<TransferForm />) };
export const CartaoDeCredito: Story = { name: "CardSpendingForm", render: () => modalFrame(<CardSpendingForm activeTab="simple" />) };
export const CartaoAvancado: Story = { name: "CardSpendingForm — avançada", render: () => modalFrame(<CardSpendingForm activeTab="advanced" />) };

export const CabecalhoDoFormulario: Story = {
    name: "TransactionHeader",
    render: () => (
        <div className="w-96 space-y-3">
            <TransactionHeader type="spending" isEditing={false} />
            <TransactionHeader type="income" isEditing />
            <TransactionHeader type="transfer" isEditing={false} />
            <TransactionHeader type="spending" isEditing isSeriesTransaction />
        </div>
    ),
};

export const PainelAnimado: Story = {
    name: "AnimatedTransactionFormPanel",
    render: () => {
        const [tab, setTab] = useState<"simple" | "advanced">("simple");
        return (
            <div className="w-80">
                <button type="button" onClick={() => setTab(tab === "simple" ? "advanced" : "simple")} className="mb-3 rounded-xl border border-white/[0.12] px-3 py-1.5 text-sm">Alternar aba</button>
                <AnimatedTransactionFormPanel activeTab={tab}><div className="rounded-xl border border-white/[0.12] p-4 text-sm">Aba: {tab}</div></AnimatedTransactionFormPanel>
            </div>
        );
    },
};

const details = (overrides: Partial<TransactionDetailsController> = {}): TransactionDetailsController => ({
    annotation: "Compra feita no mercado do bairro.",
    attachments: [{ id: "att-1", transactionId: "tx-1", fileName: "nota-fiscal.pdf", storagePath: "x", mimeType: "application/pdf", sizeBytes: 182_400, createdAt: "2026-11-01T12:00:00Z" }],
    stagedFiles: [],
    loading: false,
    error: "",
    disabled: false,
    setAnnotation: fn(),
    addFiles: fn(),
    removeStagedFile: fn(),
    removeAttachment: fn(),
    downloadAttachment: async () => undefined,
    commit: async () => undefined,
    ...overrides,
});

export const DetalhesDaTransacao: Story = { name: "TransactionDetailsField", render: () => <div className="w-96"><TransactionDetailsField details={details()} /></div> };
export const DetalhesComErro: Story = { name: "TransactionDetailsField — erro", render: () => <div className="w-96"><TransactionDetailsField details={details({ error: "Não foi possível carregar os detalhes da transação.", attachments: [] })} /></div> };
export const DetalhesCarregando: Story = { name: "TransactionDetailsField — carregando", render: () => <div className="w-96"><TransactionDetailsField details={details({ loading: true })} /></div> };

function FieldsHarness({ tab }: { tab: "simple" | "advanced" }) {
    const form = useTransactionForm({ type: "spending" });
    const detailsController = useTransactionDetails({ transactionId: form.transactionId, userId: undefined, loadExisting: false });
    return (
        <div className="w-[480px]">
            <TransactionFormFields activeTab={tab} form={form} details={detailsController} installmentPlan={null} disabled={false} />
        </div>
    );
}
export const CamposDoFormularioSimples: Story = { name: "TransactionFormFields — simples", render: () => <FieldsHarness tab="simple" /> };
export const CamposDoFormularioAvancados: Story = { name: "TransactionFormFields — avançados", render: () => <FieldsHarness tab="advanced" /> };

export const BotoesDoFormulario: Story = {
    name: "FormActionButtons",
    render: () => (
        <div className="w-[480px] space-y-4">
            <FormActionButtons submitting={false} justSaved={false} submitLabel="Salvar" onCancel={fn()} onSubmit={fn()} onContinue={fn()} />
            <FormActionButtons submitting justSaved={false} submitLabel="Salvar" onCancel={fn()} onSubmit={fn()} />
            <FormActionButtons submitting={false} justSaved submitLabel="Salvar" onCancel={fn()} onSubmit={fn()} onContinue={fn()} />
        </div>
    ),
};

const plan = (overrides: Partial<InstallmentPlan> = {}): InstallmentPlan => ({
    preview: buildInstallmentPreview({ amount: 1200, countInput: "6", startDate: "2026-12-10", showDay: true }),
    disabled: false,
    onAmountChange: fn(),
    onSpread: fn(),
    onUseSumAsTotal: fn(),
    onReset: fn(),
    ...overrides,
});

export const PreviaDeParcelas: Story = { name: "InstallmentPreviewPanel", render: () => <div className="w-80"><InstallmentPreviewPanel plan={plan()} /></div> };
export const PreviaLateral: Story = { name: "InstallmentPreviewAside", render: () => <div className="w-80"><InstallmentPreviewAside plan={plan()} /></div> };
export const PreviaLateralVazia: Story = { name: "InstallmentPreviewAside — sem plano", render: () => <InstallmentPreviewAside plan={null} /> };
export const AvisoDeParcelas: Story = {
    name: "InstallmentPlanWarning",
    render: () => <div className="w-80"><InstallmentPlanWarning plan={plan({ preview: buildInstallmentPreview({ amount: 1200, countInput: "6", startDate: "2026-12-10", showDay: true, overrides: { 0: { amount: 100, manual: true } } }) })} /></div>,
};
export const DicaDeValor: Story = {
    name: "InstallmentAmountHint",
    render: () => <div className="w-80"><InstallmentAmountHint transactionId="tx-installment-3" amountInput="650" scope="this_and_next" /></div>,
};

const card = SAMPLE_SNAPSHOT.creditCards[0];
const category = SAMPLE_SNAPSHOT.categories.find((item) => item.id === "system-category-expense-food") ?? SAMPLE_SNAPSHOT.categories[0];
const beneficiary = SAMPLE_SNAPSHOT.beneficiaries[1];
const tag = SAMPLE_SNAPSHOT.tags[0];
const wallet = SAMPLE_SNAPSHOT.wallets[0];

export const OpcoesDeFormulario: Story = {
    name: "Conteúdo das opções (listas suspensas)",
    render: () => {
        const invoiceOptions = buildCardInvoiceOptions(card, SAMPLE_SNAPSHOT.creditCardInvoices, []);
        return (
            <div className="w-72 space-y-3 text-sm">
                <CategoryOptionContent option={{ label: category.name, category, level: 0 }} />
                <WalletOptionContent option={{ label: wallet.name, wallet }} />
                <BeneficiaryOptionContent option={{ label: beneficiary.name, beneficiary }} />
                <TagOptionContent option={{ label: tag.name, tag }} />
                <CreditCardOptionContent option={{ id: card.id, label: card.name, searchText: card.name, creditCard: card }} />
                <CardCategoryOption option={{ id: category.id, label: category.name, searchText: category.name, category, level: 0, rootCategoryId: category.id, categoryId: category.id }} />
                <CardBeneficiaryOption option={{ id: beneficiary.id, label: beneficiary.name, searchText: beneficiary.name, beneficiary }} />
                <CardTagOption option={{ id: tag.id, label: tag.name, searchText: tag.name, color: tag.color }} />
                <EditScopeOptionContent option={EDIT_SCOPE_OPTIONS[1]} />
                <EditScopeSelectedContent option={EDIT_SCOPE_OPTIONS[1]} />
                {invoiceOptions.slice(0, 3).map((option) => <InvoiceOptionContent key={option.id} option={option} />)}
            </div>
        );
    },
};
