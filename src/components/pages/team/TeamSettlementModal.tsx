import { useMemo, useState } from "react";
import { useFinanceActions, useFinanceFavoriteWallet, useFinanceWallets } from "../../../context/FinanceContext";
import { useModal } from "../../../context/ModalContext";
import type { TeamSummary } from "../../../context/teamTypes";
import { extractCurrencyDigits, formatCurrencyFromDigits, parseCurrencyDigitsToNumber } from "../../../lib/currencyMask";
import { getLocalTodayDate } from "../../../lib/localDate";
import { ModalBody, ModalCancelButton, ModalError, ModalFooter, ModalHeader, ModalPanel, ModalPrimaryButton } from "../../modal/ModalChrome";
import { ModalStructure } from "../../modal/ModalStructure";
import { DateField } from "../../transactions/DateField";
import { SingleSelectCombobox } from "../../transactions/SingleSelectCombobox";
import { FIELD_LABEL_CLASS } from "../../transactions/transactionForm.constants";

interface TeamSettlementModalProps {
    team: TeamSummary;
    currentUserId: string;
    initialFromMemberId?: string;
    initialAmount?: number;
    onSaved: () => void;
}

/** Acerto recebido: entra na minha carteira e zera a dívida, sem contar como receita. */
export function TeamSettlementModal({ team, currentUserId, initialFromMemberId = "", initialAmount, onSaved }: TeamSettlementModalProps) {
    const { closeModal } = useModal();
    const { addTransaction } = useFinanceActions();
    const wallets = useFinanceWallets();
    const favoriteWalletId = useFinanceFavoriteWallet();
    const [fromMemberChoice, setFromMemberChoice] = useState(initialFromMemberId);
    const [walletChoice, setWalletChoice] = useState("");
    const [date, setDate] = useState(getLocalTodayDate());
    const [amountInput, setAmountInput] = useState(formatCurrencyFromDigits(String(Math.round((initialAmount ?? 0) * 100))));
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const memberOptions = useMemo(
        () => team.members.filter((member) => member.uid !== currentUserId).map((member) => ({ id: member.uid, label: member.displayName, searchText: member.displayName })),
        [currentUserId, team.members],
    );
    const walletOptions = useMemo(
        () => wallets.filter((wallet) => wallet.isActive).map((wallet) => ({ id: wallet.id, label: wallet.name, searchText: wallet.name })),
        [wallets],
    );

    const fromMemberId = fromMemberChoice || memberOptions[0]?.id || "";
    const walletId = walletChoice || (walletOptions.find((option) => option.id === favoriteWalletId) ?? walletOptions[0])?.id || "";

    const handleSubmit = async () => {
        if (submitting) return;
        const amount = parseCurrencyDigitsToNumber(extractCurrencyDigits(amountInput));
        const fromName = team.members.find((member) => member.uid === fromMemberId)?.displayName;
        if (!fromName) return setError("Escolha quem fez o pagamento.");
        if (!walletId) return setError("Escolha a carteira em que o dinheiro entrou.");
        if (amount <= 0) return setError("Informe um valor maior que zero.");

        setSubmitting(true);
        setError(null);
        try {
            await addTransaction({
                type: "income",
                value: amount,
                date,
                inWallet: walletId,
                paymentMethod: "wallet",
                description: `Acerto da equipe: ${fromName}`,
                status: "paid",
                transactionMode: "single",
                teamExpense: { kind: "settlement", teamId: team.id, fromMemberId },
            });
            onSaved();
            closeModal();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Não foi possível registrar o acerto.");
            setSubmitting(false);
        }
    };

    return (
        <ModalStructure height="auto" width="480px">
            <ModalPanel className="max-h-[90vh] text-left">
                <ModalHeader title="Registrar acerto recebido" disabled={submitting} />
                <ModalBody className="flex flex-col gap-4">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm text-white/60">Valor recebido</span>
                        <input
                            className="w-full bg-transparent text-4xl font-semibold tracking-tight tabular-nums text-white outline-none"
                            inputMode="numeric"
                            value={amountInput}
                            onChange={(event) => setAmountInput(formatCurrencyFromDigits(extractCurrencyDigits(event.target.value)))}
                        />
                    </label>
                    <div className="flex flex-col gap-1.5">
                        <span className={FIELD_LABEL_CLASS}>Quem pagou</span>
                        <SingleSelectCombobox hideLabel disableSearch label="Quem pagou" value={fromMemberId} placeholder="Membro da equipe" emptyMessage="Nenhum outro membro." options={memberOptions} onChange={setFromMemberChoice} renderOptionContent={(option) => option.label} disabled={submitting} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className={FIELD_LABEL_CLASS}>Entrou na carteira</span>
                        <SingleSelectCombobox hideLabel label="Carteira" value={walletId} placeholder="Sua carteira" emptyMessage="Nenhuma carteira ativa." options={walletOptions} onChange={setWalletChoice} renderOptionContent={(option) => option.label} disabled={submitting} />
                    </div>
                    <DateField value={date} onChange={setDate} disabled={submitting} />
                    <p className="text-xs text-white/40">O valor entra no seu saldo, mas não conta como receita nos relatórios.</p>
                    {error ? <ModalError>{error}</ModalError> : null}
                </ModalBody>
                <ModalFooter>
                    <ModalCancelButton disabled={submitting} />
                    <ModalPrimaryButton onClick={() => void handleSubmit()} disabled={submitting}>
                        {submitting ? "Salvando..." : "Registrar acerto"}
                    </ModalPrimaryButton>
                </ModalFooter>
            </ModalPanel>
        </ModalStructure>
    );
}
