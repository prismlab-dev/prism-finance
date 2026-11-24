import { NotebookPen, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useFinanceActions, useFinanceBeneficiaries, useFinanceCreditCards, useFinanceSession, useFinanceFavoriteWallet, useFinanceTransactionGroups, useFinanceWallets, type Category, type Transaction, type TransactionDraft, type CreditCard, type TransactionStatus, type Wallet } from "../../../context/FinanceContext";
import type { TeamSplitMode } from "../../../context/finance/teamExpense";
import { useModal } from "../../../context/ModalContext";
import { findTeamBeneficiary, syncedTeamBeneficiary, teamBeneficiaryId } from "../../../context/team/teamBeneficiary";
import { buildTeamSplit } from "../../../context/team/teamExpenseSplit";
import type { TeamSummary } from "../../../context/teamTypes";
import { extractCurrencyDigits, formatCurrencyFromDigits, parseCurrencyDigitsToNumber } from "../../../lib/currencyMask";
import { getLocalDateFromOffset, getLocalTodayDate } from "../../../lib/localDate";
import { WalletAvatar } from "../../common/WalletAvatar";
import { AddTransactionModal } from "../../modal/AddTransaction";
import { ModalStructure } from "../../modal/ModalStructure";
import { DateField } from "../../transactions/DateField";
import { TransactionFieldIcon } from "../../transactions/TransactionFieldIcon";
import { FIELD_EMBEDDED_INPUT_CLASS, FIELD_ICON_CONTROL_CLASS } from "../../transactions/transactionForm.constants";
import { IconTextField } from "../../transactions/IconTextField";
import { FormActionButtons } from "../../transactions/SaveAndContinue";
import { SingleSelectCombobox, type ComboboxOptionBase } from "../../transactions/SingleSelectCombobox";
import { CategoryOptionContent, StatusField } from "../../transactions/TransactionFormParts";
import { DEFAULT_EXPENSE_CATEGORY_ID, DEFAULT_INCOME_CATEGORY_ID } from "../../../context/finance/constants";
import { createId } from "../../../context/finance/helpers";
import { saveTransactionDetails } from "../../../supabase/finance/transactionDetailsService";
import type { TeamShareStatus } from "../../../context/team/teamShareStatus";
import { AnimatedTransactionFormPanel } from "../../transactions/AnimatedTransactionFormPanel";
import { TransactionFormTabs, type TransactionFormTab } from "../../transactions/TransactionFormTabs";
import { TeamExpenseSettlements } from "./TeamExpenseSettlements";
import { TeamSplitFields, type TeamSplitMemberState } from "./TeamSplitFields";
import { useTeamCategories } from "./useTeamCategories";
import { SkeletonBlock } from "../../loading/SkeletonPrimitives";

interface PaymentOption extends ComboboxOptionBase {
    source: Wallet | CreditCard;
    isCard: boolean;
}

interface CategoryOption extends ComboboxOptionBase {
    category: Category;
    level: 0 | 1;
}

function PaymentOptionContent({ option }: { option: PaymentOption }) {
    return (
        <div className="flex min-w-0 items-center gap-2">
            <WalletAvatar wallet={option.source} className="h-7 w-7 rounded-md border border-white/[0.12]" iconSize={14} iconStrokeWidth={1.7} />
            <span className="truncate">{option.label}</span>
            <span className="ml-auto shrink-0 text-xs text-white/40">{option.isCard ? "Cartão" : "Carteira"}</span>
        </div>
    );
}

function formatAmount(value: number): string {
    return formatCurrencyFromDigits(String(Math.round(Math.abs(value) * 100)));
}

interface TeamExpenseFormModalProps {
    team: TeamSummary;
    onSaved: () => void;
    /** Despesa minha já criada: o modal edita a mesma transação pessoal. */
    transaction?: Transaction;
    /** Status que a equipe vê (no cartão difere do pessoal, que segue a fatura). */
    teamStatus?: string;
    /** Partes desta despesa e se já foram acertadas (só na edição). */
    shareStatus?: TeamShareStatus[];
    /** Receita: recebi na minha carteira e repasso as partes. Na edição vem do vínculo salvo. */
    kind?: "expense" | "income";
}

/**
 * Despesa paga ou receita recebida por mim e dividida com a equipe. Fica no meu livro
 * pessoal (saldo/fatura) já com a divisão.
 */
export function TeamExpenseFormModal({ team, onSaved, transaction, teamStatus, shareStatus, kind: kindProp = "expense" }: TeamExpenseFormModalProps) {
    const { closeModal, openModal } = useModal();
    const { addTransaction, addBeneficiary, updateTransaction } = useFinanceActions();
    const beneficiaries = useFinanceBeneficiaries();
    const groups = useFinanceTransactionGroups();
    const existing = transaction ? groups.find((group) => group.id === transaction.groupId)?.teamExpense : undefined;
    const existingExpense = existing?.kind !== "settlement" ? existing : undefined;
    // Parte que já veio paga pela confirmação salva; desfazer no formulário precisa vencer o status do banco.
    const kind = existingExpense?.kind ?? kindProp;
    const isIncome = kind === "income";
    const existingPaidAt = (memberId: string) => Boolean(existingExpense?.shares.find((share) => share.memberId === memberId)?.paidAt);
    const wallets = useFinanceWallets();
    const creditCards = useFinanceCreditCards();
    const favoriteWalletId = useFinanceFavoriteWallet();
    const { categories, loading: categoriesLoading } = useTeamCategories(team);
    const [amountInput, setAmountInput] = useState(transaction ? formatAmount(transaction.value) : "");
    const [status, setStatus] = useState<TransactionStatus>(teamStatus === "pending" || (!teamStatus && transaction?.status === "pending") ? "pending" : "paid");
    const [date, setDate] = useState(transaction?.date ?? getLocalTodayDate());
    const [paymentChoice, setPaymentChoice] = useState(transaction ? (transaction.creditCardId ? `card:${transaction.creditCardId}` : `wallet:${transaction.inWallet}`) : "");
    const [categoryChoice, setCategoryChoice] = useState(existingExpense?.categoryId ?? "");
    const [title, setTitle] = useState(transaction?.description ?? "");
    const [note, setNote] = useState(existingExpense?.note ?? "");
    const { user } = useFinanceSession();
    // Id fixo desde a abertura: a anotação pessoal é gravada nessa mesma transação.
    const [transactionId] = useState(() => transaction?.id ?? createId("tx"));
    const [mode, setMode] = useState<TeamSplitMode>(existingExpense?.mode ?? "equal");
    const [split, setSplit] = useState<Record<string, TeamSplitMemberState>>(() =>
        Object.fromEntries(team.members.map((member) => {
            const share = existingExpense?.shares.find((item) => item.memberId === member.uid);
            if (!existingExpense) return [member.uid, { included: member.role !== "viewer", value: "" }];
            return [member.uid, { included: Boolean(share), value: share && share.value ? String(share.value).replace(".", ",") : "", paidAt: share?.paidAt }];
        })),
    );
    const [activeTab, setActiveTab] = useState<TransactionFormTab>("simple");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const paymentOptions = useMemo<PaymentOption[]>(() => [
        ...wallets.filter((wallet) => wallet.isActive).map((wallet) => ({ id: `wallet:${wallet.id}`, label: wallet.name, searchText: wallet.name, source: wallet, isCard: false })),
        // Receita entra numa carteira; cartão só para despesa.
        ...(isIncome ? [] : creditCards.filter((card) => card.isActive).map((card) => ({ id: `card:${card.id}`, label: card.name, searchText: `${card.name} cartão`, source: card, isCard: true }))),
    ], [creditCards, isIncome, wallets]);
    const categoryOptions = useMemo<CategoryOption[]>(() => {
        const expenseCategories = categories.filter((category) => category.type === kind && category.isActive);
        return expenseCategories.filter((category) => !category.parentId).flatMap((root) => [
            { id: root.id, label: root.name, searchText: root.name, category: root, level: 0 as const },
            ...expenseCategories.filter((category) => category.parentId === root.id)
                .map((sub) => ({ id: sub.id, label: sub.name, searchText: `${sub.name} ${root.name}`, category: sub, level: 1 as const })),
        ]);
    }, [categories, kind]);
    // Sem escolha do usuário, já vem marcada a carteira favorita e o "Sem categoria" da equipe.
    const paymentId = paymentChoice || (paymentOptions.find((option) => option.id === `wallet:${favoriteWalletId}`) ?? paymentOptions[0])?.id || "";
    const categoryId = categoryChoice || (categoryOptions.find((option) => option.id === (isIncome ? DEFAULT_INCOME_CATEGORY_ID : DEFAULT_EXPENSE_CATEGORY_ID)) ?? categoryOptions[0])?.id || "";
    const isCard = paymentId.startsWith("card:");

    const handleSubmit = async () => {
        if (submitting) return;
        const amount = parseCurrencyDigitsToNumber(extractCurrencyDigits(amountInput));
        const paymentTargetId = paymentId.slice(paymentId.indexOf(":") + 1);
        if (amount <= 0) return setError("Informe um valor maior que zero.");
        if (!paymentId) return setError(isIncome ? "Escolha a carteira em que o dinheiro entrou." : "Escolha a carteira ou o cartão que pagou.");
        if (!title.trim()) return setError(isIncome ? "Descreva a receita." : "Descreva a despesa.");

        const members = team.members
            .filter((member) => split[member.uid]?.included)
            .map((member) => ({ memberId: member.uid, value: Number((split[member.uid]?.value ?? "").replace(",", ".")) || 0, paidAt: split[member.uid]?.paidAt }));
        const built = buildTeamSplit({ teamId: team.id, kind, mode, categoryId: categoryId || null, note, total: amount, members });
        if ("error" in built) {
            setActiveTab("advanced");
            return setError(built.error);
        }

        const card = isCard ? creditCards.find((item) => item.id === paymentTargetId) : undefined;
        setSubmitting(true);
        setError("");
        try {
            const existingBeneficiary = findTeamBeneficiary(beneficiaries, team);
            const syncedBeneficiary = syncedTeamBeneficiary(existingBeneficiary, team);
            if (syncedBeneficiary) await addBeneficiary(syncedBeneficiary);
            const teamBeneficiary = syncedBeneficiary ?? existingBeneficiary ?? { id: teamBeneficiaryId(team.id) };
            const draft: TransactionDraft = {
                id: transaction ? undefined : transactionId,
                type: isIncome ? "income" : "spending",
                value: isIncome ? amount : -amount,
                date,
                inWallet: card ? card.bankWalletId ?? "default" : paymentTargetId,
                paymentMethod: card ? "credit_card" : "wallet",
                creditCardId: card?.id ?? null,
                description: title.trim(),
                // No livro pessoal, o beneficiário é a equipe, com o nome e a foto dela.
                beneficiaryId: teamBeneficiary.id,
                // No cartão o lado pessoal segue a fatura (pendente até pagá-la); o status
                // escolhido vale só para a equipe, sem debitar a carteira duas vezes.
                status: card ? "pending" : status,
                transactionMode: "single",
                teamExpense: card && built.teamExpense.kind === "expense" ? { ...built.teamExpense, teamStatus: status === "paid" ? "paid" : "pending" } : built.teamExpense,
            };
            // Na edição, a compra no cartão mantém o status pessoal (segue a fatura).
            if (transaction) await updateTransaction({ transaction, draft: { ...draft, status: card ? transaction.status : status }, scope: "single" });
            else await addTransaction(draft);
            // A mesma observação vira a anotação da transação no seu espaço pessoal.
            if (user && note.trim() !== (existingExpense?.note ?? "").trim()) {
                await saveTransactionDetails({ userId: user.uid, transactionId, annotation: note, files: [], attachmentsToRemove: [] });
            }
            onSaved();
            // Confirmados agora: abre a receita do reembolso (despesa) ou a despesa do repasse (receita) para revisar.
            const received = (shareStatus ?? []).filter((share) => split[share.memberId]?.paidAt && !existingPaidAt(share.memberId));
            if (received.length > 0) {
                const names = received.map((share) => team.members.find((member) => member.uid === share.memberId)?.displayName.split(" ")[0] ?? "membro").join(", ");
                openModal(
                    <AddTransactionModal
                        type={isIncome ? "spending" : "income"}
                        prefill={{
                            initialAmount: received.reduce((sum, share) => sum + share.amount, 0),
                            initialDescription: title.trim(),
                            initialAnnotation: isIncome ? `Repasse para ${names}` : `Reembolso de ${names}`,
                            initialBeneficiaryId: teamBeneficiary.id,
                            initialDate: getLocalTodayDate(),
                            initialStatus: "paid",
                        }}
                    />,
                );
                return;
            }
            closeModal();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : isIncome ? "Não foi possível salvar a receita." : "Não foi possível salvar a despesa.");
            setSubmitting(false);
        }
    };

    return (
        <ModalStructure height="650px" width="720px" topContent={<TransactionFormTabs activeTab={activeTab} onChange={setActiveTab} />}>
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.09] bg-surface p-4 text-white shadow-[0_26px_70px_-38px_rgba(0,0,0,0.95)]">
                <header className="flex shrink-0 items-center justify-between gap-3">
                    <h1 className="ml-1 text-sm uppercase opacity-50">{`${transaction ? "Editando" : "Nova"} ${isIncome ? "receita" : "despesa"} da equipe`}</h1>
                    <button type="button" onClick={closeModal} disabled={submitting} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.03] text-white/70 transition-colors hover:border-white/[0.22] hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-55" aria-label="Fechar modal" title="Fechar">
                        <X size={15} />
                    </button>
                </header>

                {error ? <p role="alert" className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p> : null}

                <div className="mt-3 min-h-0 flex-1">
                    <AnimatedTransactionFormPanel activeTab={activeTab}>
                        {activeTab === "simple" ? (
                            <section className="elegant-scrollbar flex h-full flex-col gap-3 overflow-y-auto pr-1">
                                <input
                                    className="rounded-xl border border-white/[0.1] bg-black/35 px-3 py-2 text-2xl text-white outline-none transition-colors placeholder:text-white/35 focus:border-white/[0.24] disabled:cursor-not-allowed disabled:opacity-65"
                                    inputMode="numeric"
                                    placeholder="R$ 0,00"
                                    value={amountInput}
                                    onChange={(event) => setAmountInput(formatCurrencyFromDigits(extractCurrencyDigits(event.target.value)))}
                                    disabled={submitting}
                                />
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                    <StatusField status={status} onChange={setStatus} disabled={submitting} />
                                    <DateField hideLabel value={date} onChange={setDate} onOffset={(offset) => setDate(getLocalDateFromOffset(offset))} disabled={submitting} />
                                </div>
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                    <SingleSelectCombobox hideLabel label={isIncome ? "Recebido em" : "Pago com"} value={paymentId} placeholder={isIncome ? "Sua carteira" : "Sua carteira ou cartão"} emptyMessage="Cadastre uma carteira ou cartão nas suas finanças." options={paymentOptions} onChange={setPaymentChoice} renderOptionContent={(option) => <PaymentOptionContent option={option} />} disabled={submitting} />
                                    {categoriesLoading ? (
                                        <SkeletonBlock className="h-full min-h-10 rounded-xl" />
                                    ) : (
                                    <SingleSelectCombobox hideLabel label="Categoria" value={categoryId} placeholder="Selecione uma categoria" emptyMessage="Nenhuma categoria da equipe." options={categoryOptions} onChange={setCategoryChoice} renderOptionContent={(option) => <CategoryOptionContent option={option} />} disabled={submitting} />
                                    )}
                                </div>
                                <IconTextField ariaLabel="Descrição" placeholder={isIncome ? "Descrição da receita" : "Descrição da despesa"} value={title} onChange={setTitle} maxLength={160} disabled={submitting} />
                                <label className={`${FIELD_ICON_CONTROL_CLASS} flex items-start gap-2`}>
                                    <TransactionFieldIcon icon={NotebookPen} className="mt-0.5 text-violet-200/75" />
                                    <textarea
                                        aria-label="Observação"
                                        value={note}
                                        onChange={(event) => setNote(event.target.value)}
                                        disabled={submitting}
                                        maxLength={2000}
                                        rows={3}
                                        placeholder="Observação para a equipe"
                                        className={`${FIELD_EMBEDDED_INPUT_CLASS} resize-none leading-6`}
                                    />
                                </label>
                                <p className="pl-1 text-xs text-white/40">
                                    {isIncome
                                        ? "Entra no seu saldo e você repassa as partes. A equipe vê só que você recebeu, nunca a carteira."
                                        : "Sai do seu saldo ou da sua fatura. A equipe vê só que você pagou, nunca a carteira ou o cartão."}
                                </p>
                            </section>
                        ) : (
                            <section className="elegant-scrollbar flex h-full flex-col gap-4 overflow-y-auto pr-1">
                                <TeamSplitFields
                                    members={team.members}
                                    total={parseCurrencyDigitsToNumber(extractCurrencyDigits(amountInput))}
                                    mode={mode}
                                    onModeChange={setMode}
                                    state={split}
                                    onStateChange={(memberId, next) => setSplit((current) => ({ ...current, [memberId]: next }))}
                                    disabled={submitting}
                                />
                                {shareStatus?.length ? (
                                    <TeamExpenseSettlements
                                        // A confirmação feita aqui ainda não foi salva: vale o que está no formulário.
                                        shares={shareStatus.map((share) => ({ ...share, paid: Boolean(split[share.memberId]?.paidAt) || (share.paid && !existingPaidAt(share.memberId)) }))}
                                        members={team.members}
                                        kind={kind}
                                        canRevert={(memberId) => Boolean(split[memberId]?.paidAt)}
                                        newlyReceived={shareStatus.filter((share) => split[share.memberId]?.paidAt && !existingPaidAt(share.memberId)).reduce((sum, share) => sum + share.amount, 0)}
                                        onRevert={submitting ? undefined : (memberId) => setSplit((current) => ({
                                            ...current,
                                            [memberId]: { ...(current[memberId] ?? { included: true, value: "" }), paidAt: undefined },
                                        }))}
                                        onConfirm={submitting ? undefined : (memberId) => setSplit((current) => ({
                                            ...current,
                                            [memberId]: { ...(current[memberId] ?? { included: true, value: "" }), paidAt: new Date().toISOString() },
                                        }))}
                                    />
                                ) : null}
                            </section>
                        )}
                    </AnimatedTransactionFormPanel>
                </div>

                <footer className="mt-4 flex shrink-0 justify-end border-t border-white/[0.06] pt-4">
                    <FormActionButtons submitting={submitting} justSaved={false} submitLabel="Salvar e fechar" onCancel={closeModal} onSubmit={() => void handleSubmit()} />
                </footer>
            </div>
        </ModalStructure>
    );
}
