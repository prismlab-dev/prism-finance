import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SAMPLE_BUDGET_NAME_BY_ID, SAMPLE_MONTH_LABEL, SAMPLE_RULE_OPTIONS, SAMPLE_RULE_RESOLVER, previewSampleRules, suggestSampleAmount } from "../../stories/mocks/sampleBudgets";
import { SAMPLE_SNAPSHOT, SAMPLE_TRANSACTIONS } from "../../stories/mocks/sampleFinance";
import { AddBeneficiary } from "./AddBeneficiary";
import { AddCardSpending } from "./AddCardSpending";
import { AddCategory } from "./AddCategory";
import { AddCreditCard } from "./AddCreditCard";
import { AddIncome } from "./AddIncome";
import { AddSpending } from "./AddSpending";
import { AddTag } from "./AddTag";
import { AddTransactionModal } from "./AddTransaction";
import { AddTransferModal } from "./AddTransferModal";
import { AddWallet } from "./AddWallet";
import { AddWishItem } from "./AddWishItem";
import { BalanceModal } from "./BalanceModal";
import { BudgetFormModal } from "./BudgetFormModal";
import { BulkTransactionEditModal } from "./BulkTransactionEditModal";
import { CardPaymentsChoice } from "./CardPaymentsChoice";
import { CreditCardModal } from "./CreditCardModal";
import { DeleteCreditCardModal } from "./DeleteCreditCardModal";
import { EditTransaction } from "./EditTransaction";
import { PayCreditCardInvoiceModal } from "./PayCreditCardInvoiceModal";
import { PlanningInvoiceMonthModal } from "./PlanningInvoiceMonthModal";
import { PlanningMonthField, PlanningSimulationModal } from "./PlanningSimulationModal";
import { TransactionSeriesModal } from "./TransactionSeriesModal";

// Modais do app. Aqui aparecem soltos; no app o DisplayModal os coloca sobre um fundo escurecido.
const meta = { title: "Componentes/Modais/Formulários e ações", parameters: { layout: "padded" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const s = SAMPLE_SNAPSHOT;
const wallet = s.wallets[0];
const card = s.creditCards[0];
const invoice = s.creditCardInvoices.find((item) => item.creditCardId === card.id && item.totalAmount > 0) ?? s.creditCardInvoices[0];
const installment = SAMPLE_TRANSACTIONS.find((transaction) => transaction.installmentNumber === 3) ?? SAMPLE_TRANSACTIONS[0];

export const NovaCarteira: Story = { name: "AddWallet — nova", render: () => <AddWallet /> };
export const EditarCarteira: Story = { name: "AddWallet — editar", render: () => <AddWallet mode="edit" walletId={wallet.id} initialWallet={wallet} /> };
export const SaldoInicial: Story = { name: "BalanceModal", render: () => <BalanceModal mode="edit" walletId={wallet.id} initialWallet={wallet} /> };
export const NovoCartao: Story = { name: "AddCreditCard — novo", render: () => <AddCreditCard /> };
export const EditarCartao: Story = { name: "AddCreditCard — editar", render: () => <AddCreditCard mode="edit" creditCardId={card.id} initialCreditCard={card} /> };
export const ModalDoCartao: Story = { name: "CreditCardModal", render: () => <CreditCardModal mode="edit" creditCardId={card.id} initialCreditCard={card} /> };
export const ExcluirCartao: Story = { name: "DeleteCreditCardModal", render: () => <DeleteCreditCardModal creditCard={card} /> };
export const NovoBeneficiario: Story = { name: "AddBeneficiary — novo", render: () => <AddBeneficiary /> };
export const EditarBeneficiario: Story = { name: "AddBeneficiary — editar", render: () => <AddBeneficiary mode="edit" beneficiaryId={s.beneficiaries[1].id} initialBeneficiary={s.beneficiaries[1]} /> };
export const NovaCategoria: Story = { name: "AddCategory — nova", render: () => <AddCategory /> };
export const EditarCategoria: Story = { name: "AddCategory — editar", render: () => <AddCategory mode="edit" categoryId={s.categories[0].id} initialCategory={s.categories[0]} /> };
export const NovaTag: Story = { name: "AddTag — nova", render: () => <AddTag /> };
export const EditarTag: Story = { name: "AddTag — editar", render: () => <AddTag mode="edit" tagId={s.tags[0].id} initialTag={s.tags[0]} /> };
export const NovoDesejo: Story = { name: "AddWishItem — novo", render: () => <AddWishItem /> };
export const EditarDesejo: Story = { name: "AddWishItem — editar", render: () => <AddWishItem mode="edit" wishItemId={s.wishItems[0].id} initialWishItem={s.wishItems[0]} /> };

export const NovaDespesa: Story = { name: "AddSpending", render: () => <AddSpending /> };
export const NovaReceita: Story = { name: "AddIncome", render: () => <AddIncome /> };
export const NovaTransacao: Story = { name: "AddTransactionModal", render: () => <AddTransactionModal type="spending" /> };
export const NovaTransferencia: Story = { name: "AddTransferModal", render: () => <AddTransferModal /> };
export const NovoGastoNoCartao: Story = { name: "AddCardSpending", render: () => <AddCardSpending /> };
export const EditarTransacao: Story = { name: "EditTransaction", render: () => <EditTransaction transaction={SAMPLE_TRANSACTIONS[3]} /> };
export const SerieDaTransacao: Story = { name: "TransactionSeriesModal", render: () => <TransactionSeriesModal transaction={installment} /> };
export const EdicaoEmMassa: Story = {
    name: "BulkTransactionEditModal",
    render: () => <BulkTransactionEditModal transactions={SAMPLE_TRANSACTIONS.slice(0, 4)} context="wallet" onApplied={fn()} />,
};
export const PagarFatura: Story = { name: "PayCreditCardInvoiceModal", render: () => <PayCreditCardInvoiceModal invoice={invoice} creditCard={card} /> };
export const PagarFaturaSemCarteira: Story = { name: "PayCreditCardInvoiceModal — sem carteira", render: () => <PayCreditCardInvoiceModal invoice={invoice} creditCard={card} defaultSettleWithoutWallet /> };

export const EscolhaDePagamentos: Story = {
    name: "CardPaymentsChoice",
    render: () => (
        <div className="w-[420px]">
            <CardPaymentsChoice
                value="keep"
                onChange={fn()}
                walletPayments={[{ wallet, total: 2330, payments: [{ id: "p1", date: "2026-10-17", amount: 1280, invoiceMonth: "2026-10" }, { id: "p2", date: "2026-09-17", amount: 1050, invoiceMonth: "2026-09" }] }]}
            />
        </div>
    ),
};

export const FormularioDeOrcamento: Story = {
    name: "BudgetFormModal",
    render: () => (
        <BudgetFormModal
            ruleOptions={SAMPLE_RULE_OPTIONS}
            labelOf={SAMPLE_RULE_RESOLVER.labelOf}
            monthLabel={SAMPLE_MONTH_LABEL}
            budgetNameById={SAMPLE_BUDGET_NAME_BY_ID}
            previewRules={previewSampleRules}
            suggestAmount={suggestSampleAmount}
            onSubmit={fn()}
        />
    ),
};
export const EditarOrcamento: Story = {
    name: "BudgetFormModal — editar",
    render: () => (
        <BudgetFormModal
            initialBudget={s.planning.budgets[0]}
            ruleOptions={SAMPLE_RULE_OPTIONS}
            labelOf={SAMPLE_RULE_RESOLVER.labelOf}
            monthLabel={SAMPLE_MONTH_LABEL}
            budgetNameById={SAMPLE_BUDGET_NAME_BY_ID}
            previewRules={previewSampleRules}
            suggestAmount={suggestSampleAmount}
            onSubmit={fn()}
        />
    ),
};

export const SimularReceita: Story = { name: "PlanningSimulationModal — receita", render: () => <PlanningSimulationModal tone="income" monthKey="2026-12" onSubmit={fn()} /> };
export const SimularDespesa: Story = { name: "PlanningSimulationModal — despesa", render: () => <PlanningSimulationModal tone="expense" monthKey="2026-12" onSubmit={fn()} /> };
export const CampoDeMes: Story = { name: "PlanningMonthField", render: () => <div className="w-64"><PlanningMonthField value="2026-12" onChange={fn()} /></div> };
export const MoverCobranca: Story = {
    name: "PlanningInvoiceMonthModal",
    render: () => <PlanningInvoiceMonthModal label="Cartão Roxo" amount={1980} dueMonthKey="2026-12" chargeMonthKey="2026-12" onSubmit={fn()} />,
};
