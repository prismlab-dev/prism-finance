import { DELETE_ALL_INSTALLMENTS_ACTION } from "./transactionContextActions";
import { useTransactionContextActionHandler } from "./useTransactionContextActionHandler";
import { useState } from "react";
import { CircleX, Copy, SquareSlash, Trash2, X } from "lucide-react";
import { type Transaction, type TransactionType, useFinanceSession } from "../../context/FinanceContext";
import { useModal } from "../../context/ModalContext";
import { AnimatedTransactionFormPanel } from "./AnimatedTransactionFormPanel";
import { extractCurrencyDigits, parseCurrencyDigitsToNumber } from "../../lib/currencyMask";
import { getLocalTodayDate } from "../../lib/localDate";
import { InstallmentPlanWarning } from "./InstallmentPlanWarning";
import type { InstallmentPlan } from "./installmentPreview";
import { useInstallmentPlan } from "./useInstallmentPlan";
import { TransactionFormFields } from "./TransactionFormFields";
import { TransactionHeader } from "./TransactionFormParts";
import type { TransactionFormTab } from "./TransactionFormTabs";
import { FormActionButtons, useSaveAndContinue } from "./SaveAndContinue";
import { getTransactionSubmitErrorMessage } from "./transactionSubmitError";
import { useTransactionDetails } from "./useTransactionDetails";
import { useTransactionForm, type TransactionFormPrefill } from "./useTransactionForm";
import { ModalFooterAction } from "../modal/ModalChrome";
import { IconButton } from "../ui/IconButton";
import { ModalPanel } from "../modal/ModalChrome";
import { Alert } from "../ui/Alert";
export type { TransactionFormPrefill } from "./useTransactionForm";

interface TransactionFormProps {
    type?: TransactionType;
    transaction?: Transaction | null;
    mode?: "default" | "invoice_payment_edit";
    prefill?: TransactionFormPrefill;
    activeTab?: TransactionFormTab;
    onInstallmentPlanChange?: (plan: InstallmentPlan | null) => void;
}

type SuccessfulCompletion = "close" | "continue";

export function TransactionForm(props: TransactionFormProps) {
    const { formKey, justSaved, markSaved } = useSaveAndContinue();
    return <TransactionFormBody key={formKey} {...props} justSaved={justSaved} onSavedAndContinue={markSaved} />;
}

function TransactionFormBody({
    type,
    transaction,
    mode = "default",
    prefill,
    activeTab = "simple",
    onInstallmentPlanChange,
    justSaved,
    onSavedAndContinue,
}: TransactionFormProps & { justSaved: boolean; onSavedAndContinue: () => void }) {
    const { closeModal } = useModal();
    const handleContextAction = useTransactionContextActionHandler();
    const { user } = useFinanceSession();
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [pendingDetailsCompletion, setPendingDetailsCompletion] = useState<SuccessfulCompletion | null>(null);
    const form = useTransactionForm({ type, transaction, mode, prefill });
    const details = useTransactionDetails({ transactionId: form.transactionId, userId: user?.uid, loadExisting: form.isEditing });

    const installmentPlan = useInstallmentPlan({
        enabled: form.transactionMode === "installment" && !form.isInstallmentEdit,
        amount: parseCurrencyDigitsToNumber(extractCurrencyDigits(form.amountInput)),
        countInput: form.installmentCountInput,
        startDate: form.date || getLocalTodayDate(),
        showDay: true,
        disabled: submitting || Boolean(pendingDetailsCompletion),
        overrides: form.installmentOverrides,
        setOverrides: form.setInstallmentOverrides,
        setTotalAmount: form.setTotalAmount,
        onChange: onInstallmentPlanChange,
    });

    const finishSuccessfulAction = (completion: SuccessfulCompletion) => {
        setPendingDetailsCompletion(null);
        if (completion === "continue") {
            onSavedAndContinue();
            return;
        }
        closeModal();
    };

    const runAction = async (action: () => Promise<boolean>, completion: SuccessfulCompletion, persistDetails = false) => {
        if (submitting) return;

        setSubmitting(true);
        setSubmitError("");
        const resolvedCompletion = pendingDetailsCompletion ?? completion;

        try {
            if (!pendingDetailsCompletion) {
                const success = await action();
                if (!success) {
                    setSubmitting(false);
                    return;
                }
            }

            if (persistDetails) {
                try {
                    await details.commit();
                } catch (detailsError) {
                    console.error("Failed to save transaction details:", detailsError);
                    setPendingDetailsCompletion(resolvedCompletion);
                    setSubmitError("A transação foi salva, mas a anotação ou os anexos não. Tente salvar novamente para concluir os detalhes.");
                    setSubmitting(false);
                    return;
                }
            }

            finishSuccessfulAction(resolvedCompletion);
        } catch (error) {
            console.error("Failed to submit transaction form:", error);
            setSubmitError(getTransactionSubmitErrorMessage(error));
            setSubmitting(false);
        }
    };

    return (
        <ModalPanel className="h-full">
            <header className="flex shrink-0 items-center justify-between gap-3">
                <TransactionHeader type={form.resolvedType} isEditing={form.isEditing} isSeriesTransaction={form.isSeriesTransaction} isInvoicePaymentEdit={form.isInvoicePaymentEdit} />
                <IconButton onClick={closeModal} disabled={submitting} aria-label="Fechar modal" title="Fechar">
                    <X size={15} />
                </IconButton>
            </header>

            {submitError ? <Alert tone="error" className="mt-3">{submitError}</Alert> : null}

            <div className="mt-3 min-h-0 flex-1">
                <AnimatedTransactionFormPanel activeTab={activeTab}>
                    <TransactionFormFields
                        activeTab={activeTab}
                        form={form}
                        transaction={transaction}
                        details={details}
                        installmentPlan={installmentPlan}
                        disabled={submitting || Boolean(pendingDetailsCompletion)}
                        detailsDisabled={submitting}
                    />
                </AnimatedTransactionFormPanel>
            </div>

            {installmentPlan && activeTab === "simple" ? <InstallmentPlanWarning plan={installmentPlan} className="mt-3 shrink-0 min-[1280px]:hidden" /> : null}

            <footer className="mt-4 flex shrink-0 flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-wrap gap-1">
                    {form.isEditing && !form.isInvoicePaymentEdit ? (
                        <>
                            {!(form.isInstallmentEdit && form.editScope === "this_and_next") && (
                                <ModalFooterAction
                                    onClick={() => (transaction && form.isInstallmentEdit && form.editScope === "all" ? handleContextAction(transaction, DELETE_ALL_INSTALLMENTS_ACTION) : void runAction(form.remove, "close"))}
                                    disabled={submitting || Boolean(pendingDetailsCompletion)}
                                >
                                    <Trash2 size={15} /> {form.isInstallmentEdit && form.editScope === "all" ? "Excluir todas" : "Excluir"}
                                </ModalFooterAction>
                            )}
                            <ModalFooterAction onClick={() => void runAction(form.duplicate, "close")} disabled={submitting || Boolean(pendingDetailsCompletion)}><Copy size={15} /> Duplicar</ModalFooterAction>
                            <ModalFooterAction onClick={() => void runAction(form.ignore, "close", true)} disabled={submitting || Boolean(pendingDetailsCompletion)}><SquareSlash size={15} /> Ignorar</ModalFooterAction>
                            <ModalFooterAction onClick={() => void runAction(form.cancelTransaction, "close", true)} disabled={submitting || Boolean(pendingDetailsCompletion)}><CircleX size={15} /> Cancelar</ModalFooterAction>
                        </>
                    ) : null}
                </div>

                <div className="flex justify-end">
                    <FormActionButtons
                        submitting={submitting}
                        justSaved={justSaved}
                        submitLabel={pendingDetailsCompletion ? "Salvar detalhes" : "Salvar e fechar"}
                        onCancel={closeModal}
                        onSubmit={() => void runAction(form.submit, "close", true)}
                        onContinue={form.isEditing ? undefined : () => void runAction(form.saveAndContinue, "continue", true)}
                        continueDisabled={Boolean(pendingDetailsCompletion)}
                    />
                </div>
            </footer>
        </ModalPanel>
    );
}
