import { Check, ChevronDown, ChevronsUpDown, ChevronUp, HandCoins } from "lucide-react";
import { Fragment, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useFinanceSession } from "../../../context/FinanceContext";
import type { TeamShareStatus } from "../../../context/team/teamShareStatus";
import type { TeamExpenseEntry } from "../../../context/teamTypes";
import { getCategoryIconComponent } from "../../../lib/categoryIcons";
import { useLocalPreferenceSection } from "../../../lib/localPreferences";
import { BeneficiaryAvatar } from "../../common/BeneficiaryAvatar";
import { ColumnResizeHandle } from "../../common/ColumnResizeHandle";
import { TableColumnToggleBar } from "../../common/TableColumnToggleButton";
import { InfoTag } from "../../transactions/InfoTag";
import { TransactionDetailIndicators } from "../../transactions/TransactionDetailIndicators";
import { TransactionContextMenu, type TransactionContextMenuState } from "../../transactions/TransactionContextMenu";
import type { TransactionContextAction } from "../../transactions/transactionContextActions";
import { formatCurrencyBRL, formatTransactionDate } from "../../transactions/transactionView";
import { formatReportCurrency } from "../planning/planningReportFormatting";
import { formatMonthLabel, STATUS_BADGE_CLASS, STATUS_LABELS } from "../transactions/transactionsPageShared";
import {
    DEFAULT_TEAM_EXPENSES_TABLE_VIEW,
    normalizeTeamExpensesTableView,
    sortTeamExpenses,
    TEAM_EXPENSE_COLUMN_LABELS,
    TEAM_EXPENSE_DEFAULT_WIDTHS,
    TEAM_EXPENSES_TABLE_VIEW_SECTION,
    type TeamExpenseColumn,
} from "./teamExpensesTableView";


interface TeamExpensesListProps {
    expenses: TeamExpenseEntry[];
    /** Aba de receitas: muda títulos e a cor do valor. */
    isIncome: boolean;
    /** Partes de cada despesa e se já foram acertadas (por transactionId). */
    shareStatus: Map<string, TeamShareStatus[]>;
    selectedMonth: string;
    nameOf: (memberId: string) => string;
    /** Foto de perfil do membro, quando ele tem uma. */
    photoOf: (memberId: string) => string | null;
    /** Ações do botão direito; vazio desativa o menu da linha. */
    actionsFor: (expense: TeamExpenseEntry) => TransactionContextAction[];
    onAction: (expense: TeamExpenseEntry, action: TransactionContextAction) => void;
    onOpen: (expense: TeamExpenseEntry) => void;
}

function CategoryCell({ category }: { category: TeamExpenseEntry["category"] }) {
    const color = category?.color ?? "#9CA3AF";
    const Icon = getCategoryIconComponent(category?.icon ?? null, "expense");
    return (
        <div className="flex min-w-0 max-w-full items-center gap-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ color, backgroundColor: `${color}22` }}>
                <Icon size={14} />
            </span>
            <span className="truncate">{category?.name ?? "Sem categoria"}</span>
        </div>
    );
}

/** Fotos de quem deve a parte; check verde em cima de quem já acertou. */
function SharesCell({ shares, nameOf, photoOf }: { shares: TeamShareStatus[] | undefined; nameOf: (memberId: string) => string; photoOf: (memberId: string) => string | null }) {
    if (!shares?.length) return <span className="text-white/25">—</span>;
    const paidCount = shares.filter((share) => share.paid).length;
    return (
        <div className="flex min-w-0 items-center gap-2">
            <div className="flex -space-x-1.5" aria-hidden>
                {shares.map((share) => (
                    <span key={share.memberId} className="relative">
                        <BeneficiaryAvatar
                            beneficiary={{ name: nameOf(share.memberId), avatarImage: photoOf(share.memberId), avatarColor: "#374151" }}
                            className={`h-7 w-7 rounded-full border-2 border-[#141414] ${share.paid ? "" : "grayscale"}`}
                        />
                        {/* Quem ainda deve fica em preto e branco; quem acertou ganha o check. */}
                        {share.paid ? (
                            <span className="absolute -right-0.5 -top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400 text-black ring-2 ring-[#141414]">
                                <Check size={9} strokeWidth={3.5} />
                            </span>
                        ) : null}
                    </span>
                ))}
            </div>
            <span aria-label={`${paidCount} de ${shares.length} pagaram`}>
                <InfoTag small>{paidCount}/{shares.length}</InfoTag>
            </span>
        </div>
    );
}

interface SortableHeaderProps {
    label: string;
    active: boolean;
    direction: "asc" | "desc";
    align: "left" | "right";
    onSort: () => void;
    resizeHandle: ReactNode;
}

/** Mesmo cabeçalho ordenável da tabela de transações. */
function SortableHeader({ label, active, direction, align, onSort, resizeHandle }: SortableHeaderProps) {
    const Icon = !active ? ChevronsUpDown : direction === "asc" ? ChevronUp : ChevronDown;
    return (
        <th
            aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
            className={`relative overflow-hidden whitespace-nowrap border-b border-white/[0.08] px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-white/45 ${align === "right" ? "text-right" : "text-left"}`}
        >
            <button type="button" onClick={onSort} className={`group inline-flex w-full min-w-0 items-center gap-1 transition-colors hover:text-white/80 ${align === "right" ? "justify-end" : "justify-start"}`}>
                <span className="truncate uppercase">{label}</span>
                <Icon size={13} strokeWidth={2.25} aria-hidden className={`shrink-0 transition-colors ${active ? "text-white/85" : "text-white/20 group-hover:text-white/55"}`} />
            </button>
            {resizeHandle}
        </th>
    );
}

const CELL = "overflow-hidden whitespace-nowrap border-b border-white/[0.04] px-3 py-2.5";

export function TeamExpensesList({ expenses, isIncome, shareStatus, selectedMonth, nameOf, photoOf, actionsFor, onAction, onOpen }: TeamExpensesListProps) {
    const { user } = useFinanceSession();
    const [view, setView] = useLocalPreferenceSection(user?.uid, TEAM_EXPENSES_TABLE_VIEW_SECTION, DEFAULT_TEAM_EXPENSES_TABLE_VIEW, normalizeTeamExpensesTableView);
    const [contextMenu, setContextMenu] = useState<TransactionContextMenuState | null>(null);
    // Mesmo indicador de anotação da tabela pessoal, alimentado pela observação da equipe.
    const noteFlags = useMemo(
        () => ({ annotations: new Map(expenses.flatMap((expense) => (expense.note ? [[expense.transactionId, expense.note] as const] : []))), attachmentNames: new Map<string, string[]>() }),
        [expenses],
    );
    const sortedExpenses = useMemo(() => sortTeamExpenses(expenses, view, nameOf), [expenses, nameOf, view]);
    const visibleColumns = view.columnOrder.filter((column) => !view.hiddenColumns.includes(column));
    const contextExpense = expenses.find((expense) => expense.transactionId === contextMenu?.transactionId);
    const contextActions = contextExpense ? actionsFor(contextExpense) : [];
    const total = expenses.filter((expense) => expense.kind !== "settlement").reduce((sum, expense) => sum + expense.amount, 0);

    const handleContextMenu = (event: MouseEvent<HTMLTableRowElement>, expense: TeamExpenseEntry) => {
        if (actionsFor(expense).length === 0) return;
        event.preventDefault();
        setContextMenu({ transactionId: expense.transactionId, x: event.clientX, y: event.clientY });
    };

    // Na receita, quem recebeu e quem tem a receber a parte.
    const columnLabel = (column: TeamExpenseColumn) =>
        isIncome && column === "payer" ? "Recebido por" : isIncome && column === "shares" ? "Quem recebe" : TEAM_EXPENSE_COLUMN_LABELS[column];

    const handleSort = (column: TeamExpenseColumn) =>
        setView((current) => ({
            ...current,
            sortField: column,
            sortDirection: current.sortField === column ? (current.sortDirection === "asc" ? "desc" : "asc") : column === "date" || column === "value" ? "desc" : "asc",
        }));

    const resizeHandle = (column: TeamExpenseColumn) => (
        <ColumnResizeHandle
            onWidthChange={(width) => setView((current) => ({ ...current, columnWidths: { ...current.columnWidths, [column]: width } }))}
            onReset={() => setView((current) => {
                const columnWidths = { ...current.columnWidths };
                delete columnWidths[column];
                return { ...current, columnWidths };
            })}
        />
    );

    const renderCell = (column: TeamExpenseColumn, expense: TeamExpenseEntry): ReactNode => {
        const isSettlement = expense.kind === "settlement";
        const status = expense.status in STATUS_LABELS ? (expense.status as keyof typeof STATUS_LABELS) : "pending";
        const payerId = isSettlement ? expense.fromMemberId ?? "" : expense.payerId;
        const payerName = nameOf(payerId);
        switch (column) {
            case "status":
                return <td className={CELL}><span className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]/4 font-medium ${STATUS_BADGE_CLASS[status]}`}>{STATUS_LABELS[status]}</span></td>;
            case "shares":
                return <td className={CELL}>{isSettlement ? <span className="text-white/25">—</span> : <SharesCell shares={shareStatus.get(expense.transactionId)} nameOf={nameOf} photoOf={photoOf} />}</td>;
            case "date":
                return <td className={CELL}><span className="font-medium text-white/85">{formatTransactionDate(expense.date, "dd")}</span><span className="text-white/40">{formatTransactionDate(expense.date, "/MM/yyyy")}</span></td>;
            case "description":
                return (
                    <td className="truncate border-b border-white/[0.04] px-3 py-2.5 text-[14px] font-medium text-white">
                        <div className="flex min-w-0 max-w-full items-center gap-1.5">
                            <span className="truncate">{expense.title || "Sem descrição."}</span>
                            <TransactionDetailIndicators flags={noteFlags} transactionId={expense.transactionId} />
                            {isSettlement ? (
                                <span className="inline-flex shrink-0 text-emerald-300" role="img" title={`Acerto pago a ${nameOf(expense.payerId)}`} aria-label="Acerto entre membros">
                                    <HandCoins size={13} />
                                </span>
                            ) : null}
                        </div>
                    </td>
                );
            case "category":
                return <td className={`${CELL} text-white/70`}>{isSettlement ? <span className="text-white/25">—</span> : <CategoryCell category={expense.category} />}</td>;
            case "payer":
                return (
                    <td className={`${CELL} text-white/70`}>
                        <div className="flex min-w-0 max-w-full items-center gap-2">
                            <BeneficiaryAvatar beneficiary={{ name: payerName, avatarImage: photoOf(payerId), avatarColor: "#374151" }} />
                            <span className="truncate">{payerName.split(" ")[0]}</span>
                        </div>
                    </td>
                );
            case "value":
                return (
                    <td className={`${CELL} text-right font-semibold ${isSettlement || isIncome ? "text-emerald-400" : "text-red-400"}`}>
                        <span className="mr-1 text-xs font-normal opacity-50">R$</span>
                        {formatCurrencyBRL(expense.amount)}
                    </td>
                );
        }
    };

    return (
        <section className="min-w-0 flex-1 rounded-2xl finance-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4">
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-base font-semibold uppercase text-white">
                        {isIncome ? "Receitas" : "Despesas"} <span className="mx-1.5 font-normal text-white/25">·</span><span className="font-normal capitalize text-white/45">{formatMonthLabel(selectedMonth)}</span>
                    </h2>
                    <span className="text-xs text-white/40">
                        {expenses.length} {expenses.length === 1 ? "lançamento" : "lançamentos"}
                        <span className="mx-1.5 text-white/20">|</span>
                        <span className="font-medium text-white/75">{formatReportCurrency(total)}</span>
                    </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <TableColumnToggleBar
                        columns={view.columnOrder.map((key) => ({ key, label: columnLabel(key), active: !view.hiddenColumns.includes(key) }))}
                        order={view.columnOrder}
                        onToggle={(key) => setView((current) => ({
                            ...current,
                            hiddenColumns: current.hiddenColumns.includes(key) ? current.hiddenColumns.filter((item) => item !== key) : [...current.hiddenColumns, key],
                        }))}
                        onOrderChange={(columnOrder) => setView((current) => ({ ...current, columnOrder }))}
                    />
                </div>
            </div>

            {expenses.length < 1 ? (
                <div className="mx-4 mb-4 rounded-xl border border-dashed border-white/[0.1] px-4 py-10 text-center">
                    <p className="text-sm text-white/70">{isIncome ? "Nenhuma receita da equipe neste mês." : "Nenhuma despesa da equipe neste mês."}</p>
                    <p className="mt-1 text-xs text-white/40">{isIncome ? "Troque o mês ou adicione uma receita recebida na sua carteira." : "Troque o mês ou adicione uma despesa paga com sua carteira ou cartão."}</p>
                </div>
            ) : (
                <div className="elegant-scrollbar min-w-0 overflow-x-auto px-2 pb-2">
                    <table className="finance-table w-full max-w-full table-fixed border-separate border-spacing-0 text-sm text-white/85">
                        <colgroup>
                            {visibleColumns.map((column) => {
                                const width = view.columnWidths[column] ?? TEAM_EXPENSE_DEFAULT_WIDTHS[column];
                                return <col key={column} style={width ? { width: `${width}%` } : undefined} />;
                            })}
                        </colgroup>
                        <thead>
                            <tr>
                                {visibleColumns.map((column) => (
                                    <SortableHeader
                                        key={column}
                                        label={columnLabel(column)}
                                        active={view.sortField === column}
                                        direction={view.sortDirection}
                                        align={column === "value" ? "right" : "left"}
                                        onSort={() => handleSort(column)}
                                        resizeHandle={column === "description" ? null : resizeHandle(column)}
                                    />
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedExpenses.map((expense) => (
                                <tr
                                    key={expense.transactionId}
                                    onClick={() => onOpen(expense)}
                                    onContextMenu={(event) => handleContextMenu(event, expense)}
                                    className="cursor-context-menu transition-colors"
                                >
                                    {visibleColumns.map((column) => <Fragment key={column}>{renderCell(column, expense)}</Fragment>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <TransactionContextMenu
                state={contextExpense ? contextMenu : null}
                actions={contextActions}
                onSelect={(action) => {
                    setContextMenu(null);
                    if (contextExpense) onAction(contextExpense, action);
                }}
                onClose={() => setContextMenu(null)}
            />
        </section>
    );
}
