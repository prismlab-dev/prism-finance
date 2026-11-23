import { useState } from "react";
import { CardSpendingForm, type CardSpendingFormPrefill } from "../transactions/CardSpendingForm";
import type { InstallmentPlan } from "../transactions/installmentPreview";
import { InstallmentPreviewAside } from "../transactions/InstallmentPreviewPanel";
import { TransactionFormTabs, type TransactionFormTab } from "../transactions/TransactionFormTabs";
import { ModalStructure } from "./ModalStructure";

interface AddCardSpendingProps {
    prefill?: CardSpendingFormPrefill;
}

export function AddCardSpending({ prefill }: AddCardSpendingProps) {
    const [activeTab, setActiveTab] = useState<TransactionFormTab>("simple");
    const [installmentPlan, setInstallmentPlan] = useState<InstallmentPlan | null>(null);

    return (
        <ModalStructure
            height="650px"
            width="720px"
            topContent={<TransactionFormTabs activeTab={activeTab} onChange={setActiveTab} />}
            aside={<InstallmentPreviewAside plan={installmentPlan} />}
        >
            <CardSpendingForm prefill={prefill} activeTab={activeTab} onInstallmentPlanChange={setInstallmentPlan} />
        </ModalStructure>
    );
}
