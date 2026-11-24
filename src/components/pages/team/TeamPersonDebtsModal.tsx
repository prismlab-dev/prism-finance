import { Check, ChevronRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { TeamExpenseEntry, TeamMember } from "../../../context/teamTypes";
import { getCategoryIconComponent } from "../../../lib/categoryIcons";
import { ModalBody, ModalError, ModalFooter, ModalHeader, ModalPanel, ModalPrimaryButton } from "../../modal/ModalChrome";
import { ModalStructure } from "../../modal/ModalStructure";
import { formatCurrencyBRL } from "../../transactions/transactionView";
import { MemberAvatar } from "./TeamOverviewRows";

export interface PersonDebt {
    category: TeamExpenseEntry["category"];
    kind: TeamExpenseEntry["kind"];
    transactionId: string;
    key: string;
    title: string;
    date: string;
    amount: number;
    pending: boolean;
    /** A transação é minha: posso confirmar esta parte direto aqui. */
    confirmable: boolean;
    /** Membro da parte dentro da transação. */
    shareMemberId: string;
}

interface TeamPersonDebtsModalProps {
    member: TeamMember | undefined;
    title: string;
    debts: PersonDebt[];
    tone: "owe" | "owed";
    /** Abre a transação de onde veio esta parte. */
    onOpenDebt: (debt: PersonDebt) => void;
    /** Grava a confirmação desta parte na própria transação. */
    onConfirm?: (debt: PersonDebt) => Promise<void>;
    /** Depois de confirmar, lança o dinheiro que entrou (ou saiu) na carteira. */
    onRecord: (amount: number) => void;
}

/** Extrato do saldo com uma pessoa; cada parte é confirmada uma a uma. */
export function TeamPersonDebtsModal({ member, title, debts, tone, onOpenDebt, onConfirm, onRecord }: TeamPersonDebtsModalProps) {
    const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [error, setError] = useState("");
    const open = debts.filter((debt) => !confirmed.has(debt.key));
    const openPending = open.filter((debt) => debt.pending).length;
    const total = open.reduce((sum, debt) => sum + debt.amount, 0);
    const confirmedTotal = debts.filter((debt) => confirmed.has(debt.key)).reduce((sum, debt) => sum + debt.amount, 0);
    const accent = tone === "owe" ? "text-amber-200" : "text-emerald-200";
    const verb = tone === "owe" ? "repasse" : "recebimento";

    const confirm = async (debt: PersonDebt) => {
        if (!onConfirm || savingKey) return;
        setSavingKey(debt.key);
        setError("");
        try {
            await onConfirm(debt);
            setConfirmed((current) => new Set(current).add(debt.key));
        } catch (confirmError) {
            setError(confirmError instanceof Error ? confirmError.message : `Não foi possível confirmar o ${verb}.`);
        } finally {
            setSavingKey(null);
        }
    };

    return (
        <ModalStructure height="auto" width="480px">
            <ModalPanel className="max-h-[90vh] text-left">
                <ModalHeader title={title} />
                <ModalBody className="flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <MemberAvatar member={member} className="h-12 w-12 shrink-0 rounded-full border border-white/[0.1]" />
                        <div className="min-w-0">
                            <p className="truncate text-base font-medium text-white">{member?.displayName ?? "Ex-membro"}</p>
                            <span className="mt-1 flex flex-wrap gap-1">
                                {open.length === 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/10 px-1.5 py-px text-xs text-emerald-200">
                                        <Check size={11} strokeWidth={3} /> Tudo confirmado
                                    </span>
                                ) : (
                                    <>
                                        {openPending < open.length ? (
                                            <span className="rounded-md bg-white/[0.06] px-1.5 py-px text-xs tabular-nums text-neutral-300">{open.length === 1 ? "1 transação" : `${open.length} transações`}</span>
                                        ) : null}
                                        {openPending > 0 ? (
                                            <span className="rounded-md border border-dashed border-white/[0.16] px-1.5 text-xs tabular-nums text-neutral-400">{openPending} {openPending === 1 ? "pendente" : "pendentes"}</span>
                                        ) : null}
                                    </>
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <ul className="max-h-[45vh] divide-y divide-white/[0.05] overflow-y-auto overflow-x-hidden border-y border-white/[0.06]">
                            {debts.map((debt) => {
                                const categoryColor = debt.category?.color ?? "#737373";
                                const CategoryIcon = getCategoryIconComponent(debt.category?.icon ?? null, debt.kind === "income" ? "income" : "expense");
                                const done = confirmed.has(debt.key);
                                const saving = savingKey === debt.key;
                                const canConfirm = Boolean(onConfirm) && debt.confirmable;
                                return (
                                    <li key={debt.key} className="flex items-center gap-2 pr-2">
                                        <button
                                            type="button"
                                            onClick={() => onOpenDebt(debt)}
                                            className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 text-left outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-sky-400/60"
                                        >
                                            <span
                                                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-opacity ${done ? "opacity-40" : ""}`}
                                                style={{ color: categoryColor, backgroundColor: `${categoryColor}1a`, border: `1px solid ${categoryColor}33` }}
                                            >
                                                <CategoryIcon size={18} />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className={`block truncate text-sm font-medium ${done ? "text-neutral-500" : "text-white"}`}>{debt.title || "Sem descrição"}</span>
                                                <span className="mt-1 flex items-center gap-1.5">
                                                    <span className={`text-[13px] tabular-nums ${done ? "text-neutral-500 line-through decoration-white/20" : "text-neutral-300"}`}>R$ {formatCurrencyBRL(debt.amount)}</span>
                                                    {debt.pending && !done ? <span className="rounded-md border border-dashed border-white/[0.16] px-1.5 text-xs text-neutral-400">Pendente</span> : null}
                                                </span>
                                            </span>
                                            {!canConfirm ? <ChevronRight size={16} className="shrink-0 text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-300" /> : null}
                                        </button>
                                        {canConfirm ? (
                                            done ? (
                                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1.5 text-xs font-medium text-emerald-200">
                                                    <Check size={13} strokeWidth={3} /> {tone === "owe" ? "Enviado" : "Recebido"}
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => void confirm(debt)}
                                                    disabled={savingKey !== null}
                                                    aria-label={`Confirmar ${verb}: ${debt.title || "Sem descrição"}, R$ ${formatCurrencyBRL(debt.amount)}`}
                                                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300/30 px-2.5 py-1.5 text-xs font-medium text-emerald-200 outline-none transition-colors hover:border-emerald-300/60 hover:bg-emerald-500/15 focus-visible:ring-2 focus-visible:ring-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {saving ? <LoaderCircle size={13} className="animate-spin motion-reduce:animate-none" /> : <Check size={13} strokeWidth={2.75} />}
                                                    {tone === "owe" ? "Enviei" : "Recebi"}
                                                </button>
                                            )
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm text-neutral-400">{tone === "owe" ? "Falta enviar" : "Falta receber"}</p>
                                <div className="mt-1.5 flex h-1 w-32 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
                                    <span className="h-full rounded-full bg-emerald-400/70 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(confirmed.size / Math.max(debts.length, 1)) * 100}%` }} />
                                </div>
                            </div>
                            <p className={`text-2xl font-semibold tracking-tight tabular-nums ${total > 0 ? accent : "text-neutral-500"}`}>R$ {formatCurrencyBRL(total)}</p>
                        </div>
                    </div>
                    {error ? <ModalError>{error}</ModalError> : null}
                </ModalBody>
                {confirmedTotal > 0 ? (
                    <ModalFooter start={<p className="text-xs text-neutral-500">Lance o valor {tone === "owe" ? "que saiu da" : "que entrou na"} sua carteira.</p>}>
                        <ModalPrimaryButton onClick={() => onRecord(confirmedTotal)}>
                            Lançar R$ {formatCurrencyBRL(confirmedTotal)}
                        </ModalPrimaryButton>
                    </ModalFooter>
                ) : null}
            </ModalPanel>
        </ModalStructure>
    );
}
