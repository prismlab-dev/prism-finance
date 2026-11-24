import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ModalProvider } from "../../context/ModalContext";
import { ConfirmActionModal } from "../../components/modal/ConfirmActionModal";
import { BudgetsEmptyState } from "../../components/pages/budgets/BudgetsEmptyState";
import { BudgetsToolbar } from "../../components/pages/budgets/BudgetsToolbar";
import { ExpiredLinkPage } from "../../components/pages/ExpiredLink";
import { PlanningPageHeader } from "../../components/pages/planning/PlanningPageHeader";
import { ResetPasswordPage } from "../../components/pages/ResetPassword";

// Telas montadas só com componentes que não dependem do Supabase nem do FinanceProvider.
const meta = {
    title: "Telas/Exemplos",
    parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const currentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

function BudgetsEmptyScreen() {
    const [monthKey, setMonthKey] = useState(currentMonthKey);
    return (
        <div className="flex min-h-full flex-col gap-3 p-6">
            <PlanningPageHeader toolbar={<BudgetsToolbar monthKey={monthKey} onMonthChange={setMonthKey} onCreate={() => undefined} />} />
            <BudgetsEmptyState onCreate={() => undefined} />
        </div>
    );
}

export const OrcamentosSemDados: Story = {
    name: "Orçamentos — vazio",
    render: () => <BudgetsEmptyScreen />,
};

export const LinkExpirado: Story = {
    name: "Link expirado",
    render: () => <ExpiredLinkPage isSignedIn={false} onLeave={() => undefined} />,
};

export const RedefinirSenha: Story = {
    name: "Redefinir senha",
    render: () => <ResetPasswordPage email="pessoa@exemplo.com" />,
};

export const ConfirmarExclusao: Story = {
    name: "Modal — confirmar exclusão",
    render: () => (
        <ModalProvider>
            <div className="flex min-h-screen items-center justify-center bg-black/60 p-6">
                <ConfirmActionModal
                    title="Excluir orçamento?"
                    description="Esta ação não pode ser desfeita."
                    consequences={["As transações continuam, mas deixam de contar para este orçamento."]}
                    confirmLabel="Excluir"
                    onConfirm={() => undefined}
                />
            </div>
        </ModalProvider>
    ),
};
