import { useState } from "react";
import type { TransactionType } from "../../context/FinanceContext";
import type { InstallmentPlan } from "../transactions/installmentPreview";
import { InstallmentPreviewAside } from "../transactions/InstallmentPreviewPanel";
import { TransactionForm, type TransactionFormPrefill } from "../transactions/TransactionForm";
import { TransactionFormTabs, type TransactionFormTab } from "../transactions/TransactionFormTabs";
import { ModalStructure } from "./ModalStructure";

interface AddTransactionModalProps {
    type: Extract<TransactionType, "income" | "spending">;
    prefill?: TransactionFormPrefill;
}

export function AddTransactionModal({ type, prefill }: AddTransactionModalProps) {
    const [activeTab, setActiveTab] = useState<TransactionFormTab>("simple");
    const [installmentPlan, setInstallmentPlan] = useState<InstallmentPlan | null>(null);

    return (
        <ModalStructure
            height="650px"
            width="720px"
            topContent={<TransactionFormTabs activeTab={activeTab} onChange={setActiveTab} />}
            aside={<InstallmentPreviewAside plan={installmentPlan} />}
        >
            <TransactionForm type={type} prefill={prefill} activeTab={activeTab} onInstallmentPlanChange={setInstallmentPlan} />
        </ModalStructure>
    );
}
