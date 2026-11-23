import { useState } from "react";
import type { Transaction } from "../../context/FinanceContext";
import { CardSpendingForm } from "../transactions/CardSpendingForm";
import { TransferForm } from "../transactions/TransferForm";
import { TransactionForm } from "../transactions/TransactionForm";
import type { InstallmentPlan } from "../transactions/installmentPreview";
import { InstallmentPreviewAside } from "../transactions/InstallmentPreviewPanel";
import { TransactionFormTabs, type TransactionFormTab } from "../transactions/TransactionFormTabs";
import { ModalStructure } from "./ModalStructure";

interface EditTransactionProps {
    transaction: Transaction;
}

export function EditTransaction({ transaction }: EditTransactionProps) {
    const [activeTab, setActiveTab] = useState<TransactionFormTab>("simple");
    const [installmentPlan, setInstallmentPlan] = useState<InstallmentPlan | null>(null);
    const isTransfer = transaction.type === "transfer";
    const isCreditCardSpending = transaction.type === "spending" && transaction.paymentMethod === "credit_card";
    const isInvoicePayment = transaction.systemKind === "invoice_payment";

    return (
        <ModalStructure
            height="650px"
            width={isTransfer ? "680px" : "720px"}
            topContent={<TransactionFormTabs activeTab={activeTab} onChange={setActiveTab} />}
            aside={<InstallmentPreviewAside plan={installmentPlan} />}
        >
            {isTransfer ? (
                <TransferForm transaction={transaction} activeTab={activeTab} />
            ) : isCreditCardSpending ? (
                <CardSpendingForm transaction={transaction} activeTab={activeTab} onInstallmentPlanChange={setInstallmentPlan} />
            ) : (
                <TransactionForm transaction={transaction} mode={isInvoicePayment ? "invoice_payment_edit" : "default"} activeTab={activeTab} onInstallmentPlanChange={setInstallmentPlan} />
            )}
        </ModalStructure>
    );
}
