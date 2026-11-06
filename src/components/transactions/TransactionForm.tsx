import { useState } from "react";
import { CircleX, Copy, SquareSlash, Trash2, X } from "lucide-react";
import { type Transaction, type TransactionType, useFinanceSession } from "../../context/FinanceContext";
import { useModal } from "../../context/ModalContext";
import { AnimatedTransactionFormPanel } from "./AnimatedTransactionFormPanel";
import { TransactionFormFields } from "./TransactionFormFields";
import { TransactionHeader } from "./TransactionFormParts";
import type { TransactionFormTab } from "./TransactionFormTabs";
import { FormActionButtons, useSaveAndContinue } from "./SaveAndContinue";
import { getTransactionSubmitErrorMessage } from "./transactionSubmitError";
import { useTransactionDetails } from "./useTransactionDetails";
import { useTransactionForm, type TransactionFormPrefill } from "./useTransactionForm";
export type { TransactionFormPrefill } from "./useTransactionForm";

interface TransactionFormProps {
    type?: TransactionType;
    transaction?: Transaction | null;
    mode?: "default" | "invoice_payment_edit";
    prefill?: TransactionFormPrefill;
    activeTab?: TransactionFormTab;
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
    justSaved,
    onSavedAndContinue,
}: TransactionFormProps & { justSaved: boolean; onSavedAndContinue: () => void }) {
    const { closeModal } = useModal();
    const { user } = useFinanceSession();
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [pendingDetailsCompletion, setPendingDetailsCompletion] = useState<SuccessfulCompletion | null>(null);
    const form = useTransactionForm({ type, transaction, mode, prefill });
    const details = useTransactionDetails({ transactionId: form.transactionId, userId: user?.uid, loadExisting: form.isEditing });

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
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.09] bg-[#131313] p-4 text-white shadow-[0_26px_70px_-38px_rgba(0,0,0,0.95)]">
            <header className="flex shrink-0 items-center justify-between gap-3">
                <TransactionHeader type={form.resolvedType} isEditing={form.isEditing} isSeriesTransaction={form.isSeriesTransaction} isInvoicePaymentEdit={form.isInvoicePaymentEdit} />
                <button type="button" onClick={closeModal} disabled={submitting} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.03] text-white/70 transition-colors hover:border-white/[0.22] hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-55" aria-label="Fechar modal" title="Fechar">
                    <X size={15} />
                </button>
            </header>

            {submitError ? <p className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">{submitError}</p> : null}

            <div className="mt-3 min-h-0 flex-1">
                <AnimatedTransactionFormPanel activeTab={activeTab}>
                    <TransactionFormFields
                        activeTab={activeTab}
                        form={form}
                        transaction={transaction}
                        details={details}
                        disabled={submitting || Boolean(pendingDetailsCompletion)}
                        detailsDisabled={submitting}
                    />
                </AnimatedTransactionFormPanel>
            </div>

            <footer className="mt-4 flex shrink-0 flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-wrap gap-1">
                    {form.isEditing && !form.isInvoicePaymentEdit ? (
                        <>
                            <FooterButton onClick={() => void runAction(form.remove, "close")} disabled={submitting || Boolean(pendingDetailsCompletion)}><Trash2 size={15} /> Excluir</FooterButton>
                            <FooterButton onClick={() => void runAction(form.duplicate, "close")} disabled={submitting || Boolean(pendingDetailsCompletion)}><Copy size={15} /> Duplicar</FooterButton>
                            <FooterButton onClick={() => void runAction(form.ignore, "close", true)} disabled={submitting || Boolean(pendingDetailsCompletion)}><SquareSlash size={15} /> Ignorar</FooterButton>
                            <FooterButton onClick={() => void runAction(form.cancelTransaction, "close", true)} disabled={submitting || Boolean(pendingDetailsCompletion)}><CircleX size={15} /> Cancelar transação</FooterButton>
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
        </div>
    );
}

export function FooterButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/[0.12] bg-white/[0.03] px-2 py-2 text-[11px] uppercase tracking-[0.04em] text-white/62 transition-colors hover:border-white/[0.28] hover:text-white disabled:cursor-not-allowed disabled:opacity-45">
            {children}
        </button>
    );
}
