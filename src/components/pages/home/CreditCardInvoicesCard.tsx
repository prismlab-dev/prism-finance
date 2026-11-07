import { WalletAvatar } from "../../common/WalletAvatar";
import { useMemo } from "react";
import { useFinanceCreditCardInvoices, useFinanceCreditCards } from "../../../context/FinanceContext";
import { getCreditCardInvoiceOpenAmount, getCreditCardInvoiceReadState, type CreditCardInvoiceVisualStatus } from "../../../context/finance/invoiceStatus";
import { getMonthKeyFromDateValue, resolveCreditCardInvoiceCycle } from "../../../context/financeTypes";
import { usePage } from "../../../context/PageContext";
import { getLocalTodayDate, parseAppDate } from "../../../lib/localDate";
import { formatCurrencyBRL } from "../../transactions/transactionView";

const DAY_MS = 86_400_000;
const HIGH_USAGE = 0.9;

function daysUntil(value: string, today: string) {
    const date = parseAppDate(value);
    const base = parseAppDate(today);
    return date && base ? Math.round((date.getTime() - base.getTime()) / DAY_MS) : null;
}

function formatShortDate(value: string) {
    const date = parseAppDate(value);
    return date ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date).replace(".", "") : value;
}

function dueLabel(dueDate: string, status: CreditCardInvoiceVisualStatus, today: string) {
    if (status === "paid") return "Paga";
    const days = daysUntil(dueDate, today);
    if (days !== null && days < 0) return `Venceu há ${-days} ${days === -1 ? "dia" : "dias"}`;
    const due =
        days === null ? `vence ${formatShortDate(dueDate)}` : days === 0 ? "vence hoje" : days === 1 ? "vence amanhã" : `vence em ${days} dias`;
    return `${status === "closed" ? "Fechada" : "Aberta"}, ${due}`;
}

const DUE_TONE: Partial<Record<CreditCardInvoiceVisualStatus, string>> = {
    overdue: "text-red-300",
    closed: "text-amber-200/80",
    paid: "text-emerald-300/80",
};

const percent = (value: number) => `${Math.min(Math.max(value, 0), 1) * 100}%`;

// Fatura do ciclo atual de cada cartão ativo, com uso do limite (dívida em aberto de todas as faturas).
export function CreditCardInvoicesCard() {
    const { goToPage } = usePage();
    const cards = useFinanceCreditCards();
    const invoices = useFinanceCreditCardInvoices();

    const { rows, today } = useMemo(() => {
        const todayDate = getLocalTodayDate();
        const cardRows = cards
            .filter((card) => card.isActive)
            .map((card) => {
                const cycle = resolveCreditCardInvoiceCycle(todayDate, card.closingDay, card.dueDay);
                const cardInvoices = invoices.filter((invoice) => invoice.creditCardId === card.id);
                const current = cardInvoices.find((invoice) => invoice.cycleKey === cycle.cycleKey);
                const usedLimit = cardInvoices.reduce((sum, invoice) => sum + getCreditCardInvoiceOpenAmount(invoice), 0);
                const currentOpen = current ? getCreditCardInvoiceOpenAmount(current) : 0;
                const status: CreditCardInvoiceVisualStatus = current ? getCreditCardInvoiceReadState(current, card).visualStatus : todayDate >= cycle.closingDate ? "closed" : "open";
                return {
                    card,
                    amount: current ? current.totalAmount + (current.forecastAmount ?? 0) : 0,
                    dueDate: current?.dueDate ?? cycle.dueDate,
                    status,
                    usedLimit,
                    currentOpen,
                    otherOpen: Math.max(usedLimit - currentOpen, 0),
                    usage: card.limit > 0 ? usedLimit / card.limit : 0,
                };
            });
        return { rows: cardRows, today: todayDate };
    }, [cards, invoices]);

    if (rows.length < 1) return null;

    const cycleTotal = rows.reduce((sum, row) => sum + row.amount, 0);

    return (
        <div className="w-full rounded-2xl border border-white/[0.08] bg-surface p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-lg font-medium text-white">Faturas de cartão</p>
                    <p className="text-sm text-neutral-500">Ciclo atual</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-semibold leading-none tabular-nums text-white">R$ {formatCurrencyBRL(cycleTotal)}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                        em {rows.length} {rows.length === 1 ? "cartão" : "cartões"}
                    </p>
                </div>
            </div>

            <ul className="mt-3 space-y-1">
                {rows.map(({ card, amount, dueDate, status, usedLimit, currentOpen, otherOpen, usage }) => {
                    const high = usage >= HIGH_USAGE;
                    const barColor = high ? "#F87171" : card.color;
                    return (
                        <li key={card.id}>
                            <button
                                type="button"
                                onClick={() => goToPage("statement", { page: "statement", selectedCardId: card.id, selectedMonth: getMonthKeyFromDateValue(dueDate) })}
                                className="-mx-2 block w-[calc(100%+1rem)] rounded-xl px-2 py-3 text-left outline-none transition-colors hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-sky-400/60"
                            >
                                <span className="flex items-center gap-3">
                                    <WalletAvatar wallet={card} className="h-9 w-9 rounded-xl border border-white/10" iconSize={16} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-white">{card.name}</span>
                                        <span className={`block truncate text-xs ${DUE_TONE[status] ?? "text-neutral-500"}`}>{dueLabel(dueDate, status, today)}</span>
                                    </span>
                                    <span className="shrink-0 text-sm font-semibold tabular-nums text-white">R$ {formatCurrencyBRL(amount)}</span>
                                </span>

                                {card.limit > 0 && (
                                    <span className="mt-2.5 block pl-12">
                                        <span
                                            className="flex h-1 overflow-hidden rounded-full bg-white/[0.06]"
                                            role="img"
                                            aria-label={`${Math.round(usage * 100)}% do limite usado: R$ ${formatCurrencyBRL(currentOpen)} na fatura atual e R$ ${formatCurrencyBRL(otherOpen)} em outras faturas`}
                                        >
                                            <span className="h-full transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: percent(currentOpen / card.limit), backgroundColor: barColor }} />
                                            <span className="h-full opacity-40 transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: percent(otherOpen / card.limit), backgroundColor: barColor }} />
                                        </span>
                                        <span className="mt-1.5 flex justify-between gap-3 text-[11px] tabular-nums text-neutral-500">
                                            <span className={high ? "text-red-300" : undefined}>{Math.round(usage * 100)}% do limite</span>
                                            <span>R$ {formatCurrencyBRL(Math.max(card.limit - usedLimit, 0))} livres</span>
                                        </span>
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
