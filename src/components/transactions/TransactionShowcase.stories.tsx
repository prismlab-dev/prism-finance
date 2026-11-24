import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Transaction } from "../../context/FinanceContext";
import { SAMPLE_TRANSACTIONS } from "../../stories/mocks/sampleFinance";
import { ShareTransactionModal } from "./ShareTransactionModal";
import { TransactionShowcase, type TransactionShowcaseTeam } from "./TransactionShowcase";

// Comprovante do compartilhar transação: com quadro (imagem exportada) e solto (como aparece no modal).
const meta = { title: "Componentes/Transações/Comprovante (compartilhar)" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function pick(predicate: (transaction: Transaction) => boolean): Transaction {
    const transaction = SAMPLE_TRANSACTIONS.find(predicate) ?? SAMPLE_TRANSACTIONS[0];
    if (!transaction) throw new Error("Mock sem transações");
    return transaction;
}

const spending = pick((transaction) => transaction.type === "spending" && transaction.paymentMethod !== "credit_card");
const cardSpending = pick((transaction) => transaction.paymentMethod === "credit_card");
const income = pick((transaction) => transaction.type === "income");
const USER = { kind: "user" as const, name: "Ana Souza", image: null };

const TEAM: TransactionShowcaseTeam = {
    payerName: "Ana Souza",
    status: "paid",
    category: { name: "Eventos", icon: null, color: "#a78bfa" },
    shares: [
        { memberId: "a", name: "Ana Souza", photoUrl: null, amount: 120, paid: false, isPayer: true },
        { memberId: "b", name: "Bruno Lima", photoUrl: null, amount: 120, paid: true, isPayer: false },
        { memberId: "c", name: "Carla Melo", photoUrl: null, amount: 120.5, paid: false, isPayer: false },
    ],
};

export const Despesa: Story = {
    render: () => <TransactionShowcase transaction={spending} sourceLabel="Conta corrente" note="Dividido com a família no fim do mês." owner={USER} />,
};

export const GastoNoCartao: Story = {
    name: "Gasto no cartão",
    render: () => <TransactionShowcase transaction={cardSpending} sourceLabel="Cartão principal" owner={USER} />,
};

export const Receita: Story = {
    render: () => <TransactionShowcase transaction={income} sourceLabel="Conta corrente" owner={USER} />,
};

export const DespesaDaEquipe: Story = {
    name: "Despesa da equipe",
    render: () => <TransactionShowcase transaction={spending} sourceLabel="" note="Inclui a gorjeta." team={TEAM} owner={{ kind: "team", name: "Time Produto", image: null }} />,
};

export const SoltoNoModal: Story = {
    name: "Sem quadro (modal)",
    render: () => (
        <div className="w-[440px]">
            <TransactionShowcase bare transaction={spending} sourceLabel="Conta corrente" owner={USER} />
        </div>
    ),
};

export const Modal: Story = {
    render: () => <ShareTransactionModal transaction={spending} sourceLabel="Conta corrente" />,
};
