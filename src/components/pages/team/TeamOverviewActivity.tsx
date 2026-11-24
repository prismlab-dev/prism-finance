import { ArrowDownLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import { useFinanceActions, useFinanceBeneficiaries, useFinanceSession, useFinanceTransactionGroups, useFinanceTransactions } from "../../../context/FinanceContext";
import { useModal } from "../../../context/ModalContext";
import { usePage } from "../../../context/PageContext";
import { findTeamBeneficiary, teamBeneficiaryId } from "../../../context/team/teamBeneficiary";
import { buildTeamShareStatus } from "../../../context/team/teamShareStatus";
import type { TeamExpenseEntry, TeamSummary } from "../../../context/teamTypes";
import { getLocalTodayDate } from "../../../lib/localDate";
import { AddTransactionModal } from "../../modal/AddTransaction";
import { formatCurrencyBRL } from "../../transactions/transactionView";
import { dayLabel } from "../home/RecentTransactionsPanel";
import { ActivityRow, MemberAvatar, OverviewCard, PersonDebtRow, OverviewEmpty, PendingRow, parseDay } from "./TeamOverviewRows";
import { TeamExpenseFormModal } from "./TeamExpenseFormModal";
import { type PersonDebt, TeamPersonDebtsModal } from "./TeamPersonDebtsModal";
import { TeamActivitySkeleton } from "./TeamSkeletons";
import { useTeamExpenses } from "./useTeamExpenses";

interface Debt {
    category: TeamExpenseEntry["category"];
    kind: TeamExpenseEntry["kind"];
    /** Membro da parte dentro da transação (quem recebe a confirmação). */
    shareMemberId: string;
    confirmable: boolean;
    transactionId: string;
    key: string;
    memberId: string;
    title: string;
    date: string;
    /** A transação em si ainda não foi paga; a parte só vale de fato quando ela for. */
    pending: boolean;
    amount: number;
}

const DAY_MS = 86_400_000;

/** Resumo do que pede atenção: quanto eu devo, quanto me devem, despesas em aberto e o que mudou por último. */
export function TeamOverviewActivity({ team }: { team: TeamSummary }) {
    const { user } = useFinanceSession();
    const { goToPage } = usePage();
    const me = user?.uid ?? "";
    const { openModal, closeModal } = useModal();
    const transactions = useFinanceTransactions();
    const transactionGroups = useFinanceTransactionGroups();
    const beneficiaries = useFinanceBeneficiaries();
    const { updateTransaction } = useFinanceActions();
    const { view, loading, error, refresh } = useTeamExpenses(team.id);

    const { shareStatus, iOwe, owedToMe, pending, recentGroups } = useMemo(() => {
        const status = buildTeamShareStatus(view.expenses);
        const iOwe: Debt[] = [];
        const owedToMe: Debt[] = [];
        view.expenses.forEach((entry) => {
            (status.get(entry.transactionId) ?? []).filter((share) => !share.paid).forEach((share) => {
                // Despesa: o membro devolve a parte para quem pagou. Receita: quem recebeu repassa a parte ao membro.
                const debtor = entry.kind === "income" ? entry.payerId : share.memberId;
                const creditor = entry.kind === "income" ? share.memberId : entry.payerId;
                const debt = { transactionId: entry.transactionId, key: `${entry.transactionId}:${share.memberId}`, title: entry.title, date: entry.date, amount: share.amount, pending: entry.status !== "paid", category: entry.category, kind: entry.kind, shareMemberId: share.memberId, confirmable: entry.payerId === me };
                if (debtor === me) iOwe.push({ ...debt, memberId: creditor });
                else if (creditor === me) owedToMe.push({ ...debt, memberId: debtor });
            });
        });

        const recentGroups: { label: string; items: TeamExpenseEntry[] }[] = [];
        [...view.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).forEach((entry) => {
            const label = dayLabel(parseDay(entry.date));
            const last = recentGroups[recentGroups.length - 1];
            if (last?.label === label) last.items.push(entry);
            else recentGroups.push({ label, items: [entry] });
        });

        return {
            shareStatus: status,
            iOwe,
            owedToMe,
            pending: view.expenses.filter((entry) => entry.kind === "expense" && entry.status !== "paid").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
            recentGroups,
        };
    }, [me, view.expenses]);

    const memberOf = (memberId: string | null) => team.members.find((member) => member.uid === memberId);
    const firstName = (memberId: string) => memberOf(memberId)?.displayName.split(" ")[0] ?? "Ex-membro";
    const openTransactions = () => goToPage("teamTransactions");
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const seeAll = (
        <button
            type="button"
            onClick={openTransactions}
            className="rounded-full px-2.5 py-1 text-sm text-neutral-400 outline-none transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >
            Ver todas
        </button>
    );

    if (loading) return <TeamActivitySkeleton />;
    if (error) return <p role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>;

    // Uma linha por pessoa, com quem mais deve primeiro; as partes ficam em ordem de data.
    const byPerson = (debts: Debt[]) =>
        [...debts.reduce((acc, debt) => acc.set(debt.memberId, [...(acc.get(debt.memberId) ?? []), debt]), new Map<string, Debt[]>())]
            .map(([memberId, items]): [string, Debt[]] => [memberId, items.sort((a, b) => a.date.localeCompare(b.date))])
            .sort((a, b) => b[1].reduce((sum, d) => sum + d.amount, 0) - a[1].reduce((sum, d) => sum + d.amount, 0));

    // Só quem pagou tem a transação pessoal para editar; para os outros, a despesa fica em Transações da equipe.
    const openDebt = (transactionId: string) => {
        const entry = view.expenses.find((item) => item.transactionId === transactionId);
        const transaction = entry?.payerId === me ? transactions.find((item) => item.id === transactionId) : undefined;
        if (!entry || !transaction) {
            closeModal();
            openTransactions();
            return;
        }
        openModal(
            <TeamExpenseFormModal
                team={team}
                onSaved={() => void refresh()}
                transaction={transaction}
                teamStatus={entry.status}
                shareStatus={shareStatus.get(transactionId)}
                kind={entry.kind === "income" ? "income" : "expense"}
            />,
        );
    };

    // Marca só esta parte como paga na própria transação; o resto da transação não muda.
    const confirmDebt = async (debt: PersonDebt) => {
        const transaction = transactions.find((item) => item.id === debt.transactionId);
        const teamExpense = transactionGroups.find((group) => group.id === transaction?.groupId)?.teamExpense;
        if (!transaction || !teamExpense || teamExpense.kind === "settlement") throw new Error("Abra a transação para confirmar esta parte.");
        const paidAt = new Date().toISOString();
        await updateTransaction({
            transaction,
            draft: { teamExpense: { ...teamExpense, shares: teamExpense.shares.map((share) => (share.memberId === debt.shareMemberId ? { ...share, paidAt } : share)) } },
            scope: "single",
        });
        void refresh();
    };

    const openPerson = (memberId: string, debts: Debt[], tone: "owe" | "owed") => {
        const name = firstName(memberId);
        const beneficiary = findTeamBeneficiary(beneficiaries, team);
        openModal(
            <TeamPersonDebtsModal
                member={memberOf(memberId)}
                title={tone === "owe" ? `Enviar para ${name}` : `${name} te deve`}
                debts={debts}
                tone={tone}
                onOpenDebt={(debt) => openDebt(debt.transactionId)}
                onConfirm={team.currentUserRole !== "viewer" ? confirmDebt : undefined}
                onRecord={(amount) =>
                    openModal(
                        <AddTransactionModal
                            type={tone === "owe" ? "spending" : "income"}
                            prefill={{
                                initialAmount: amount,
                                initialDescription: tone === "owe" ? `Repasse para ${name}` : `Reembolso de ${name}`,
                                initialBeneficiaryId: beneficiary?.id ?? teamBeneficiaryId(team.id),
                                initialDate: getLocalTodayDate(),
                                initialStatus: "paid",
                            }}
                        />,
                    )
                }
            />,
        );
    };

    const debtCard = (title: string, debts: Debt[], tone: "owe" | "owed") => {
        const people = byPerson(debts);
        const total = debts.reduce((sum, debt) => sum + debt.amount, 0);
        const Icon = tone === "owe" ? ArrowUpRight : ArrowDownLeft;
        const accent = tone === "owe" ? "text-amber-200" : "text-emerald-200";
        return (
            <section className="flex flex-col rounded-2xl border border-white/[0.08] bg-surface p-4">
                <p className="flex items-center gap-2 text-[15px] font-medium tracking-tight text-white">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.04] ${accent}`}>
                        <Icon size={14} strokeWidth={2.4} />
                    </span>
                    {title}
                </p>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                    <p className={`text-2xl font-semibold tracking-tight tabular-nums ${accent}`}>R$ {formatCurrencyBRL(total)}</p>
                    <span className="flex -space-x-2" aria-label={people.length === 1 ? "1 pessoa" : `${people.length} pessoas`}>
                        {people.slice(0, 4).map(([memberId]) => (
                            <MemberAvatar key={memberId} member={memberOf(memberId)} className="h-7 w-7 rounded-full border-2 border-surface" />
                        ))}
                    </span>
                </div>
                <div className="mt-4 -mx-2 flex flex-col divide-y divide-white/[0.05] border-t border-white/[0.06] pt-1">
                    {people.map(([memberId, items]) => (
                        <PersonDebtRow
                            key={memberId}
                            member={memberOf(memberId)}
                            name={memberOf(memberId)?.displayName ?? "Ex-membro"}
                            count={items.length}
                            pendingCount={items.filter((debt) => debt.pending).length}
                            amount={items.reduce((sum, debt) => sum + debt.amount, 0)}
                            onClick={() => openPerson(memberId, items, tone)}
                        />
                    ))}
                </div>
            </section>
        );
    };

    return (
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
            <div className="flex min-w-0 flex-col gap-3">
                {iOwe.length === 0 && owedToMe.length === 0 ? (
                    <p className="flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-100/85">
                        <CheckCircle2 size={18} className="shrink-0 text-emerald-300" />
                        Tudo acertado: ninguém deve nada para ninguém na equipe.
                    </p>
                ) : (
                    // Só mostra o lado que tem pendência; com os dois, ficam lado a lado.
                    <div className={`grid gap-3 ${iOwe.length > 0 && owedToMe.length > 0 ? "xl:grid-cols-2" : ""}`}>
                        {iOwe.length > 0 ? debtCard("Você precisa enviar", iOwe, "owe") : null}
                        {owedToMe.length > 0 ? debtCard("Falta você receber", owedToMe, "owed") : null}
                    </div>
                )}

                <OverviewCard title="Despesas em aberto" aside={pending.length > 0 ? <span className="text-sm tabular-nums text-neutral-500">{pending.length}</span> : null}>
                    {pending.length === 0 ? (
                        <OverviewEmpty>Todas as despesas da equipe estão pagas</OverviewEmpty>
                    ) : (
                        <div className="space-y-1.5">
                            {pending.map((entry) => (
                                <PendingRow
                                    key={entry.transactionId}
                                    entry={entry}
                                    payer={memberOf(entry.payerId)}
                                    offset={Math.round((parseDay(entry.date).getTime() - todayStart) / DAY_MS)}
                                    onClick={openTransactions}
                                />
                            ))}
                        </div>
                    )}
                </OverviewCard>

            </div>

            <div className="lg:sticky lg:top-4">
                <OverviewCard title="Movimentações recentes" aside={seeAll}>
                    {recentGroups.length === 0 ? (
                        <OverviewEmpty>Nenhuma movimentação na equipe ainda</OverviewEmpty>
                    ) : (
                        <ol className="relative">
                            {recentGroups.map((group, index) => {
                                const isLast = index === recentGroups.length - 1;
                                return (
                                    <li key={group.label} className="relative pl-6">
                                        {!isLast && <span className="absolute bottom-0 left-[5px] top-4 w-px bg-white/[0.08]" />}
                                        <span className={`absolute left-0 top-[5px] h-[11px] w-[11px] rounded-full border-2 border-surface ${index === 0 ? "bg-white" : "bg-neutral-600"}`} />
                                        <p className={`pl-2 text-sm first-letter:uppercase ${index === 0 ? "font-medium text-white" : "text-neutral-400"}`}>{group.label}</p>
                                        <div className={`mt-1 ${isLast ? "" : "pb-4"}`}>
                                            {group.items.map((entry) => (
                                                <ActivityRow
                                                    key={entry.transactionId}
                                                    entry={entry}
                                                    payer={memberOf(entry.payerId)}
                                                    from={entry.kind === "settlement" ? memberOf(entry.fromMemberId) : undefined}
                                                    onClick={openTransactions}
                                                />
                                            ))}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </OverviewCard>
            </div>
        </div>
    );
}
