import { useMemo, useState } from "react";
import { type CreditCard, useFinanceActions, useFinanceCreditCardInvoices, useFinanceStoredTransactions, useFinanceTransactionGroups, useFinanceWallets } from "../../context/FinanceContext";
import { listCardWalletPayments } from "../../context/finance/permanentDeletion";
import { useModal } from "../../context/ModalContext";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { CardPaymentsChoice, type CardPaymentsChoiceValue } from "./CardPaymentsChoice";
import { groupCardPaymentsByWallet } from "./cardPaymentsByWallet";
import { ModalBody, ModalCancelButton, ModalError, ModalFooter, ModalHeader, ModalPanel } from "./ModalChrome";
import { ModalStructure } from "./ModalStructure";
import { Button } from "../ui/Button";

const REMOVAL_SUMMARY = "As compras, parcelas, recorrências e faturas deste cartão serão apagadas. Parcelas movidas para outro cartão ou carteira são mantidas.";

export function DeleteCreditCardModal({ creditCard }: { creditCard: CreditCard }) {
    const { permanentlyDeleteCreditCard, setCreditCardActive } = useFinanceActions();
    const { closeModal } = useModal();
    const wallets = useFinanceWallets();
    const creditCardInvoices = useFinanceCreditCardInvoices();
    const transactionGroups = useFinanceTransactionGroups();
    const transactions = useFinanceStoredTransactions();
    const [choice, setChoice] = useState<CardPaymentsChoiceValue>("keep");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const walletPayments = useMemo(
        () => groupCardPaymentsByWallet(listCardWalletPayments({ creditCardInvoices, transactionGroups, transactions }, creditCard.id), wallets, creditCardInvoices),
        [creditCard.id, creditCardInvoices, transactionGroups, transactions, wallets],
    );

    const deleteCard = async (keepPayments: boolean) => {
        if (creditCard.isActive) {
            await setCreditCardActive(creditCard.id, false);
        }
        await permanentlyDeleteCreditCard(creditCard.id, { keepPayments });
    };

    if (walletPayments.length === 0) {
        return (
            <ConfirmActionModal
                title="Excluir cartão em definitivo?"
                description={`O cartão "${creditCard.name}" será removido permanentemente.`}
                consequences={[REMOVAL_SUMMARY, "Para manter o histórico, use Arquivar. A exclusão permanente não pode ser desfeita."]}
                confirmLabel="Excluir em definitivo"
                // Um pagamento que chegue de outro aparelho enquanto isso nunca foi oferecido para apagar.
                onConfirm={() => deleteCard(true)}
            />
        );
    }

    const handleConfirm = async () => {
        setSubmitting(true);
        setError("");

        try {
            await deleteCard(choice === "keep");
            closeModal();
        } catch (caught) {
            console.error("Falha ao excluir cartão:", caught);
            setError(caught instanceof Error ? caught.message : "Não foi possível excluir o cartão. Tente novamente.");
            setSubmitting(false);
        }
    };

    return (
        <ModalStructure height="auto" width="520px">
            <ModalPanel>
                <ModalHeader title="Excluir cartão" disabled={submitting} />
                <ModalBody>
                    <h3 className="text-lg font-semibold leading-snug text-white">O que fazer com os pagamentos das faturas de {creditCard.name}?</h3>
                    <p className="mt-1.5 text-sm leading-6 text-white/60">{REMOVAL_SUMMARY}</p>
                    <CardPaymentsChoice walletPayments={walletPayments} value={choice} onChange={setChoice} disabled={submitting} />
                    <p className="mt-4 text-xs leading-5 text-white/55">A exclusão não pode ser desfeita. Para manter todo o histórico, arquive o cartão.</p>
                </ModalBody>
                {error ? <ModalError>{error}</ModalError> : null}
                <ModalFooter>
                    <ModalCancelButton disabled={submitting} />
                    <Button variant="danger" type="button" onClick={() => void handleConfirm()} disabled={submitting}>
                        {submitting ? "Excluindo..." : choice === "keep" ? "Excluir cartão e manter pagamentos" : "Excluir cartão e pagamentos"}
                    </Button>
                </ModalFooter>
            </ModalPanel>
        </ModalStructure>
    );
}
