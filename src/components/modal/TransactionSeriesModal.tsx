import { useMemo, type ReactNode } from "react";
import { CalendarDays, CreditCard, Layers, Repeat, SquareArrowOutUpRight, Wallet } from "lucide-react";
import {
    useFinanceBeneficiaries,
    useFinanceCategories,
    useFinanceCreditCardInvoices,
    useFinanceCreditCards,
    useFinanceStoredTransactions,
    useFinanceTransactionGroups,
    useFinanceWallets,
    type Transaction,
    type Wallet as WalletEntity,
} from "../../context/FinanceContext";
import { getMonthKeyFromDateValue } from "../../context/financeTypes";
import { useModal } from "../../context/ModalContext";
import { usePage, type TransactionsIntentTab } from "../../context/PageContext";
import { getCategoryIconComponent } from "../../lib/categoryIcons";
import { resolveCreditCardInvoiceCycle } from "../../context/finance/financeCore";
import { formatMonthLabel } from "../transactions/cardInvoiceOptions";
import { BeneficiaryAvatar } from "../common/BeneficiaryAvatar";
import { contentColorOn } from "../../lib/colorContrast";
import { WalletAvatar } from "../common/WalletAvatar";
import { ModalHeader, ModalPanel } from "./ModalChrome";
import { ModalStructure } from "./ModalStructure";
import { formatCurrencyBRL, formatTransactionDate } from "../transactions/transactionView";
import { buildTransactionSeriesView, type TransactionSeriesRow, type TransactionSeriesView } from "../transactions/transactionSeriesView";
import type { RecurrenceRule } from "../../context/finance/recurrence/types";
import type { TransactionGroupType } from "../../context/finance/domainTypes";

const MODE_LABELS = { single: "Transação única", installment: "Parcelamento", recurring: "Recorrência" } as const;
const TAB_BY_TYPE: Record<TransactionGroupType, TransactionsIntentTab> = { expense: "spending", income: "income", transfer: "transfer" };
const FALLBACK_COLOR = "#737373";

// Receita se recebe, transferência se conclui; só despesa é "paga".
const TYPE_COPY: Record<TransactionGroupType, { done: string; settledTotal: string; openTotal: string; pending: string }> = {
    expense: { done: "Pago", settledTotal: "Já pago", openTotal: "A pagar", pending: "Pendente" },
    income: { done: "Recebido", settledTotal: "Já recebido", openTotal: "A receber", pending: "A receber" },
    transfer: { done: "Transferido", settledTotal: "Já transferido", openTotal: "A transferir", pending: "Pendente" },
};

function stateLabel(state: RowState, type: TransactionGroupType): string {
    if (state === "paid") return TYPE_COPY[type].done;
    if (state === "pending") return TYPE_COPY[type].pending;
    return ROW_STATES[state].label;
}

type RowState = "paid" | "settled" | "posted" | "forecast" | "pending" | "projected" | "skipped" | "cancelled";

const ROW_STATES: Record<RowState, { label: string; chip: string; tick: string }> = {
    paid: { label: "Pago", chip: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200", tick: "bg-emerald-400" },
    settled: { label: "Fatura paga", chip: "border-teal-400/25 bg-teal-500/10 text-teal-200", tick: "bg-teal-400" },
    posted: { label: "Lançado", chip: "border-sky-400/25 bg-sky-500/10 text-sky-200", tick: "bg-sky-400" },
    forecast: { label: "Previsto", chip: "border-amber-400/25 bg-amber-500/10 text-amber-200", tick: "bg-amber-400/70" },
    pending: { label: "Pendente", chip: "border-amber-400/25 bg-amber-500/10 text-amber-200", tick: "bg-amber-400/70" },
    projected: { label: "Projeção", chip: "border-dashed border-white/20 text-white/50", tick: "border border-dashed border-white/30" },
    skipped: { label: "Ignorada", chip: "border-slate-400/25 bg-slate-500/10 text-slate-300", tick: "bg-slate-500/60" },
    cancelled: { label: "Cancelada", chip: "border-red-400/25 bg-red-500/10 text-red-200", tick: "bg-red-400/60" },
};

const SETTLED_STATES: ReadonlySet<RowState> = new Set(["paid", "settled"]);
const OPEN_STATES: ReadonlySet<RowState> = new Set(["posted", "forecast", "pending", "projected"]);

// No cartão, o status da ocorrência fica pendente até a fatura ser quitada; o que importa é a fatura.
function resolveRowState(row: TransactionSeriesRow, paidInvoiceIds: ReadonlySet<string>): RowState {
    if (row.status !== "pending") return row.status;
    if (row.projected) return "projected";
    if (row.creditCardId && row.commitment === "posted" && row.invoiceId && paidInvoiceIds.has(row.invoiceId)) return "settled";
    if (row.creditCardId) return row.commitment === "forecast" ? "forecast" : "posted";
    return "pending";
}

function money(value: number): string {
    return `R$ ${formatCurrencyBRL(value)}`;
}

function describeRule(rule: RecurrenceRule | null): string {
    if (!rule) return "Sem regra de recorrência";
    const cadence = rule.interval === 1 ? "Todo mês" : `A cada ${rule.interval} meses`;
    if (rule.end.type === "count") return `${cadence}, ${rule.end.count} ocorrências`;
    if (rule.end.type === "until") return `${cadence}, até ${formatTransactionDate(rule.end.date, "dd/MM/yyyy")}`;
    return `${cadence}, sem data de término`;
}

/** `tone` tinge o quadrado com a cor da categoria; sem ele, fundo neutro. Avatares ocupam o quadrado inteiro. */
function MetaItem({ icon, tone, children }: { icon: ReactNode; tone?: string; children: ReactNode }) {
    return (
        <span className="flex min-w-0 items-center gap-2 text-sm text-white/70">
            <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.05] text-white/55"
                style={tone ? { color: tone, backgroundColor: `${tone}1a`, borderColor: `${tone}33` } : undefined}
            >
                {icon}
            </span>
            <span className="truncate">{children}</span>
        </span>
    );
}

export function TransactionSeriesModal({ transaction }: { transaction: Transaction }) {
    const groups = useFinanceTransactionGroups();
    const storedTransactions = useFinanceStoredTransactions();
    const creditCards = useFinanceCreditCards();
    const creditCardInvoices = useFinanceCreditCardInvoices();
    const wallets = useFinanceWallets();

    const view = useMemo(
        () => buildTransactionSeriesView({ groupId: transaction.groupId, groups, storedTransactions, creditCards }),
        [creditCards, groups, storedTransactions, transaction.groupId],
    );

    const resolveAccount = (row: TransactionSeriesRow): SeriesAccount | null => {
        if (row.creditCardId) {
            const card = creditCards.find((item) => item.id === row.creditCardId);
            return { kind: "card", name: card?.name ?? "Cartão removido", visual: card ?? null };
        }
        const source = wallets.find((wallet) => wallet.id === row.sourceWalletId);
        const destination = wallets.find((wallet) => wallet.id === row.destinationWalletId);
        const name = [source?.name, destination?.name].filter(Boolean).join(" → ");
        return name ? { kind: "wallet", name, visual: source ?? destination ?? null } : null;
    };

    // Ocorrências ainda sem fatura gravada caem no ciclo calculado pela data, como na projeção.
    const resolveInvoiceMonth = (row: TransactionSeriesRow): string | null => {
        const card = creditCards.find((item) => item.id === row.creditCardId);
        if (!card) return null;
        const dueDate = creditCardInvoices.find((invoice) => invoice.id === row.invoiceId)?.dueDate ?? resolveCreditCardInvoiceCycle(row.date, card.closingDay, card.dueDay).dueDate;
        return getMonthKeyFromDateValue(dueDate);
    };

    return (
        <ModalStructure height="auto" width="880px">
            <ModalPanel>
                <ModalHeader title={view ? `Série: ${MODE_LABELS[view.mode]}` : "Série"} />
                {view ? (
                    <SeriesBody view={view} fallbackTitle={transaction.description} resolveAccount={resolveAccount} resolveInvoiceMonth={resolveInvoiceMonth} currentTransactionId={transaction.id} />
                ) : (
                    <p className="py-6 text-sm text-white/60">Não foi possível localizar o grupo desta transação.</p>
                )}
            </ModalPanel>
        </ModalStructure>
    );
}

/** Total com a quantidade num círculo preenchido na cor do valor; o número usa preto ou branco pelo contraste. */
function TotalItem({ label, value, count, color }: { label: string; value?: string; count: number | string; color: string }) {
    return (
        <div className="flex items-center gap-2">
            <dt className="text-white/45">{label}</dt>
            <dd className="flex items-center gap-1.5 font-semibold tabular-nums" style={{ color }}>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px]" style={{ backgroundColor: color, color: contentColorOn(color) }}>
                    {count}
                </span>
                {value}
            </dd>
        </div>
    );
}

interface SeriesAccount {
    kind: "card" | "wallet";
    name: string;
    /** Carteira ou cartão com ícone e cor próprios; ausente quando foi removido. */
    visual: Pick<WalletEntity, "icon" | "name" | "color"> | null;
}

interface SeriesBodyProps {
    view: TransactionSeriesView;
    fallbackTitle: string;
    resolveAccount: (row: TransactionSeriesRow) => SeriesAccount | null;
    resolveInvoiceMonth: (row: TransactionSeriesRow) => string | null;
    currentTransactionId: string;
}

function SeriesBody({ view, fallbackTitle, resolveAccount, resolveInvoiceMonth, currentTransactionId }: SeriesBodyProps) {
    const { group, totals, rows } = view;
    const categories = useFinanceCategories();
    const beneficiaries = useFinanceBeneficiaries();
    const creditCardInvoices = useFinanceCreditCardInvoices();
    const { goToPage } = usePage();
    const { closeModal } = useModal();

    const paidInvoiceIds = useMemo(() => new Set(creditCardInvoices.filter((invoice) => invoice.status === "paid").map((invoice) => invoice.id)), [creditCardInvoices]);
    const states = rows.map((row) => resolveRowState(row, paidInvoiceIds));
    const sumWhere = (match: ReadonlySet<RowState>) => rows.reduce((sum, row, index) => (match.has(states[index]) ? sum + row.amount : sum), 0);
    const paidAmount = sumWhere(SETTLED_STATES);
    const pendingAmount = sumWhere(OPEN_STATES);
    const paidCount = states.filter((state) => SETTLED_STATES.has(state)).length;
    const pendingCount = states.filter((state) => OPEN_STATES.has(state)).length;

    const category = categories.find((item) => item.id === group.categoryId);
    // Subcategoria sem cor/ícone próprios herda os da categoria-pai.
    const parentCategory = categories.find((item) => item.id === category?.parentId);
    const color = category?.color ?? parentCategory?.color ?? FALLBACK_COLOR;
    const CategoryIcon = getCategoryIconComponent(category?.icon || parentCategory?.icon, group.type === "income" ? "income" : "expense");
    const beneficiary = beneficiaries.find((item) => item.id === group.beneficiaryId);
    const categoryLabel = group.subcategoryName || group.categoryName;

    const openRow = (row: TransactionSeriesRow) => {
        closeModal();
        // Gasto no cartão não aparece em Transações: ele vive na fatura.
        const invoiceMonth = resolveInvoiceMonth(row);
        if (row.creditCardId && invoiceMonth) {
            goToPage("statement", { page: "statement", selectedCardId: row.creditCardId, selectedMonth: invoiceMonth, highlightTransactionId: row.id });
            return;
        }
        goToPage("transactions", {
            page: "transactions",
            tab: TAB_BY_TYPE[group.type],
            selectedMonth: getMonthKeyFromDateValue(row.date),
            highlightTransactionId: row.id,
        });
    };

    return (
        <div className="elegant-scrollbar mt-3 min-h-0 overflow-auto pr-1">
            <div>
                <div className="min-w-0">
                    <h2 className="truncate text-lg font-medium text-white">{group.title || fallbackTitle || categoryLabel}</h2>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
                        {categoryLabel ? <MetaItem tone={color} icon={<CategoryIcon size={15} />}>{categoryLabel}</MetaItem> : null}
                        {group.beneficiaryName ? (
                            <MetaItem icon={beneficiary ? <BeneficiaryAvatar beneficiary={beneficiary} className="h-full w-full" textClassName="text-xs font-semibold" /> : null}>
                                {group.beneficiaryName}
                            </MetaItem>
                        ) : null}
                        {rows[0] ? <MetaItem icon={<CalendarDays size={15} />}>Desde {formatTransactionDate(rows[0].date, "dd/MM/yyyy")}</MetaItem> : null}
                        {view.mode === "recurring" ? (
                            <MetaItem icon={<Repeat size={15} />}>{describeRule(group.recurrenceRule)}</MetaItem>
                        ) : (
                            <MetaItem icon={<Layers size={15} />}>Total {money(group.totalAmount)}</MetaItem>
                        )}
                    </div>
                </div>
            </div>

            <SeriesStrip rows={rows} states={states} currentTransactionId={currentTransactionId} />

            <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <TotalItem label={TYPE_COPY[group.type].settledTotal} value={money(paidAmount)} count={paidCount} color="#a7f3d0" />
                <TotalItem label={TYPE_COPY[group.type].openTotal} value={money(pendingAmount)} count={`${pendingCount}${view.hasMore ? "+" : ""}`} color="#ffffff" />
                {totals.skippedCount > 0 ? <TotalItem label="Ignoradas" count={totals.skippedCount} color="#cbd5e1" /> : null}
            </dl>

            {view.segments.length > 1 ? (
                <p className="mt-2 text-xs text-white/45">Série dividida em {view.segments.length} trechos por edições do tipo “essa e as próximas”.</p>
            ) : null}

            <ol className="elegant-scrollbar mt-4 max-h-[46vh] overflow-auto rounded-xl border border-white/[0.08] bg-black/10">
                {rows.map((row, index) => {
                    const state = ROW_STATES[states[index]];
                    const account = resolveAccount(row);
                    const invoiceMonth = resolveInvoiceMonth(row);
                    const invoiceLabel = invoiceMonth ? `Fatura de ${formatMonthLabel(invoiceMonth)}` : null;
                    const AccountIcon = account?.kind === "card" ? CreditCard : Wallet;
                    const isCurrent = row.id === currentTransactionId;
                    const isVoid = row.status === "skipped" || row.status === "cancelled";
                    const isMuted = row.projected || isVoid;

                    return (
                        <li
                            key={row.id}
                            className={`grid grid-cols-[2rem_minmax(0,1fr)_auto_auto_auto] items-center gap-x-3 border-b border-white/[0.05] px-3 py-2.5 last:border-b-0 sm:grid-cols-[2rem_9.5rem_minmax(0,1fr)_6.5rem_7rem_auto] ${
                                isCurrent ? "bg-white/[0.06] shadow-[inset_2px_0_0_rgba(255,255,255,0.6)]" : ""
                            }`}
                        >
                            <span className="text-xs tabular-nums text-white/40">
                                {row.number ?? "—"}
                                {view.mode === "installment" && group.installmentCount ? `/${group.installmentCount}` : ""}
                            </span>
                            <span className="flex min-w-0 flex-col">
                                <span className={`text-sm tabular-nums ${isMuted ? "text-white/55" : "text-white"}`}>{formatTransactionDate(row.date, "dd/MM/yyyy")}</span>
                                {invoiceLabel ? <span className="truncate text-[11px] text-white/40">{invoiceLabel}</span> : null}
                            </span>
                            <span className="hidden min-w-0 items-center gap-2 text-sm text-white/70 sm:flex">
                                {account ? (
                                    <>
                                        {account.visual ? (
                                            <WalletAvatar wallet={account.visual} className="h-6 w-6 rounded-md border border-white/[0.1]" iconSize={13} />
                                        ) : (
                                            <AccountIcon size={13} className="shrink-0 text-white/35" />
                                        )}
                                        <span className="truncate">{account.name}</span>
                                    </>
                                ) : (
                                    <span className="text-amber-200/70">Sem conta</span>
                                )}
                            </span>
                            <span className={`inline-flex justify-self-end rounded-full border px-2 py-0.5 text-[11px] sm:justify-self-start ${state.chip}`}>{stateLabel(states[index], group.type)}</span>
                            <span className={`justify-self-end text-sm tabular-nums ${isMuted ? "text-white/50" : "font-semibold text-white"} ${isVoid ? "line-through" : ""}`}>{money(row.amount)}</span>
                            <button
                                type="button"
                                onClick={() => openRow(row)}
                                className="inline-flex h-8 w-8 items-center justify-center justify-self-end rounded-lg text-white/45 outline-none transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-sky-400/60"
                                title="Ir para a transação"
                                aria-label={`Ir para a transação de ${formatTransactionDate(row.date, "dd/MM/yyyy")}`}
                            >
                                <SquareArrowOutUpRight size={15} />
                            </button>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

/** Uma marca por ocorrência, em ordem; a da transação aberta fica opaca e as demais esmaecidas. */
function SeriesStrip({ rows, states, currentTransactionId }: { rows: TransactionSeriesRow[]; states: RowState[]; currentTransactionId: string }) {
    return (
        <div className="mt-5">
            <div className="flex h-1.5 items-center gap-[2px]" aria-hidden="true">
                {rows.map((row, index) => (
                    <span key={row.id} className={`h-1.5 min-w-[2px] flex-1 rounded-full ${ROW_STATES[states[index]].tick} ${row.id === currentTransactionId ? "opacity-100" : "opacity-40"}`} />
                ))}
            </div>
        </div>
    );
}
