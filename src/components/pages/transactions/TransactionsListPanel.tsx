import { Fragment, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp, CircleSlash, Link, Repeat2 } from "lucide-react";
import { type Beneficiary, type Transaction, type Wallet, useFinanceActions, useFinanceBeneficiaries, useFinanceSession, useFinanceTransactionGroups } from "../../../context/FinanceContext";
import { useModal } from "../../../context/ModalContext";
import { getCategoryIconComponent } from "../../../lib/categoryIcons";
import { useLocalPreferenceSection } from "../../../lib/localPreferences";
import { getTransactionCategoryDisplay, getTransactionCategoryDisplayLabel } from "../../../lib/transactionCategory";
import { BeneficiaryAvatar } from "../../common/BeneficiaryAvatar";
import { TableColumnToggleBar } from "../../common/TableColumnToggleButton";
import { ColumnResizeHandle } from "../../common/ColumnResizeHandle";
import { normalizeColumnOrder, normalizeColumnWidths } from "../../common/tableColumnOrder";
import { WalletAvatar } from "../../common/WalletAvatar";
import { BulkTransactionEditModal } from "../../modal/BulkTransactionEditModal";
import { ConfirmActionModal } from "../../modal/ConfirmActionModal";
import { BulkHeaderCheckbox, BulkRowCheckbox, FloatingTransactionBulkFooter } from "../../transactions/TransactionBulkSelectionControls";
import { TransactionDetailIndicators, useTransactionDetailFlags } from "../../transactions/TransactionDetailIndicators";
import { TransactionContextMenu, type TransactionContextMenuState } from "../../transactions/TransactionContextMenu";
import { buildTransactionContextActions, type TransactionContextAction } from "../../transactions/transactionContextActions";
import { formatCurrencyBRL, formatTransactionDate, getTransactionTypeMeta, resolveTransactionWallet } from "../../transactions/transactionView";
import { isTransactionEligibleForBulkEdit, useTransactionBulkSelection } from "../../transactions/useTransactionBulkSelection";
import {
    buildSortMode,
    formatMonthLabel,
    getCurrentMonthKey,
    getSortDirection,
    getSortField,
    SORT_DEFAULT_DIRECTION,
    STATUS_BADGE_CLASS,
    STATUS_LABELS,
    type SortField,
    type SortMode,
    type TransactionsTabKey,
} from "./transactionsPageShared";

interface TransactionsListPanelProps {
    activeTab: TransactionsTabKey;
    incomeTransactions: Transaction[];
    spendingTransactions: Transaction[];
    transferTransactions: Transaction[];
    wallets: Wallet[];
    selectedMonth?: string;
    sortMode: SortMode;
    onSortModeChange: (sortMode: SortMode) => void;
    onAction: (transaction: Transaction, action: TransactionContextAction) => void;
}

type TableColumnKey = "status" | "wallet" | "date" | "description" | "category" | "tags" | "beneficiary" | "value";
const DEFAULT_COLUMN_ORDER: TableColumnKey[] = ["status", "wallet", "date", "description", "category", "tags", "beneficiary", "value"];

interface TransactionsTableViewPreferences {
    columnWidths: Partial<Record<TableColumnKey, number>>;
    columnOrder: TableColumnKey[];
    showStatus: boolean;
    showWallet: boolean;
    showDate: boolean;
    showDescription: boolean;
    showCategory: boolean;
    showTags: boolean;
    showBeneficiary: boolean;
    showValue: boolean;
}

const COLUMN_VISIBILITY_KEY: Record<TableColumnKey, Exclude<keyof TransactionsTableViewPreferences, "columnOrder" | "columnWidths">> = {
    status: "showStatus",
    wallet: "showWallet",
    date: "showDate",
    description: "showDescription",
    category: "showCategory",
    tags: "showTags",
    beneficiary: "showBeneficiary",
    value: "showValue",
};

const TRANSACTIONS_TABLE_VIEW_PREFERENCES_SECTION = "transactions.table-view";
const DEFAULT_TRANSACTIONS_TABLE_VIEW_PREFERENCES: TransactionsTableViewPreferences = {
    columnOrder: DEFAULT_COLUMN_ORDER,
    columnWidths: {},
    showStatus: true,
    showWallet: true,
    showDate: true,
    showDescription: true,
    showCategory: true,
    showTags: true,
    showBeneficiary: true,
    showValue: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTransactionsTableViewPreferences(value: unknown): TransactionsTableViewPreferences {
    if (!isRecord(value)) {
        return DEFAULT_TRANSACTIONS_TABLE_VIEW_PREFERENCES;
    }

    return {
        columnOrder: normalizeColumnOrder(value.columnOrder, DEFAULT_COLUMN_ORDER),
        columnWidths: normalizeColumnWidths(value.columnWidths, DEFAULT_COLUMN_ORDER),
        showStatus: typeof value.showStatus === "boolean" ? value.showStatus : DEFAULT_TRANSACTIONS_TABLE_VIEW_PREFERENCES.showStatus,
        showWallet: typeof value.showWallet === "boolean" ? value.showWallet : DEFAULT_TRANSACTIONS_TABLE_VIEW_PREFERENCES.showWallet,
        showDate: typeof value.showDate === "boolean" ? value.showDate : DEFAULT_TRANSACTIONS_TABLE_VIEW_PREFERENCES.showDate,
        showDescription: typeof value.showDescription === "boolean" ? value.showDescription : DEFAULT_TRANSACTIONS_TABLE_VIEW_PREFERENCES.showDescription,
        showCategory: typeof value.showCategory === "boolean" ? value.showCategory : DEFAULT_TRANSACTIONS_TABLE_VIEW_PREFERENCES.showCategory,
        showTags: typeof value.showTags === "boolean" ? value.showTags : DEFAULT_TRANSACTIONS_TABLE_VIEW_PREFERENCES.showTags,
        showBeneficiary: typeof value.showBeneficiary === "boolean" ? value.showBeneficiary : DEFAULT_TRANSACTIONS_TABLE_VIEW_PREFERENCES.showBeneficiary,
        showValue: typeof value.showValue === "boolean" ? value.showValue : DEFAULT_TRANSACTIONS_TABLE_VIEW_PREFERENCES.showValue,
    };
}

interface TabConfig {
    key: TransactionsTabKey;
    label: string;
    transactions: Transaction[];
    emptyMessage: string;
}

interface TransactionsTableProps {
    selectedMonth?: string;
    tabs: TabConfig[];
    activeTab: TransactionsTabKey;
    wallets: Wallet[];
    beneficiariesById: Map<string, Beneficiary>;
    transactionGroupsById: Map<string, FinanceTransactionGroup>;
    sortMode: SortMode;
    onSortModeChange: (sortMode: SortMode) => void;
    onAction: (transaction: Transaction, action: TransactionContextAction) => void;
}

interface SortableHeaderProps {
    label: string;
    field: SortField;
    sortMode: SortMode;
    align?: "left" | "right";
    resizeHandle?: ReactNode;
    onSortModeChange: (sortMode: SortMode) => void;
}

type FinanceTransactionGroup = ReturnType<typeof useFinanceTransactionGroups>[number];

type TransactionSeriesIndicator = { kind: "installment"; label: string } | { kind: "recurring" } | null;

function resolveTransactionSeriesIndicator(transaction: Transaction, group: FinanceTransactionGroup | undefined): TransactionSeriesIndicator {
    const installmentNumber = transaction.installmentNumber;
    const installmentCount = group?.installmentCount;

    if (Number.isInteger(installmentNumber) && Number.isInteger(installmentCount) && Number(installmentNumber) > 0 && Number(installmentCount) >= 2) {
        return {
            kind: "installment",
            label: `(${Number(installmentNumber)}/${Number(installmentCount)})`,
        };
    }

    if (group?.transactionMode === "recurring") {
        return { kind: "recurring" };
    }

    return null;
}

function getAriaSort(field: SortField, sortMode: SortMode): "ascending" | "descending" | "none" {
    if (getSortField(sortMode) !== field) {
        return "none";
    }

    return getSortDirection(sortMode) === "asc" ? "ascending" : "descending";
}

function SortableHeader({ label, field, sortMode, align = "left", resizeHandle, onSortModeChange }: SortableHeaderProps) {
    const active = getSortField(sortMode) === field;
    const direction = getSortDirection(sortMode);
    const ariaSort = getAriaSort(field, sortMode);

    const handleClick = () => {
        if (!active) {
            onSortModeChange(buildSortMode(field, SORT_DEFAULT_DIRECTION[field]));
            return;
        }

        onSortModeChange(buildSortMode(field, direction === "asc" ? "desc" : "asc"));
    };

    const Icon = !active ? ChevronsUpDown : direction === "asc" ? ChevronUp : ChevronDown;

    return (
        <th
            aria-sort={ariaSort}
            className={`relative overflow-hidden whitespace-nowrap border-b border-white/[0.08] px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-white/45 ${align === "right" ? "text-right" : "text-left"}`}
        >
            <button
                type="button"
                onClick={handleClick}
                className={`group inline-flex w-full min-w-0 items-center gap-1 transition-colors hover:text-white/80 ${align === "right" ? "justify-end" : "justify-start"}`}
            >
                <span className="truncate uppercase">{label}</span>
                <Icon size={13} strokeWidth={2.25} aria-hidden className={`shrink-0 transition-colors ${active ? "text-white/85" : "text-white/20 group-hover:text-white/55"}`} />
            </button>
            {resizeHandle}
        </th>
    );
}

function WalletTableCell({ wallet }: { wallet: Wallet }) {
    return (
        <div className="flex min-w-0 max-w-full items-center gap-2 whitespace-nowrap">
            <WalletAvatar wallet={wallet} className="h-8 w-8 rounded-md border border-white/[0.1]" iconSize={16} iconStrokeWidth={1.8} />
            <span className="truncate text-white/75">{wallet.name}</span>
        </div>
    );
}

function NoDestinationWalletCell() {
    return (
        <div className="flex min-w-0 max-w-full items-center gap-2 whitespace-nowrap text-white/55">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03]">
                <CircleSlash size={15} />
            </span>
            <span className="truncate">Nenhuma carteira</span>
        </div>
    );
}



function TransactionsTable({ tabs, activeTab, wallets, beneficiariesById, transactionGroupsById, sortMode, onSortModeChange, onAction, selectedMonth }: TransactionsTableProps) {
    const activeTabConfig = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
    const transactions = activeTabConfig?.transactions ?? [];
    const [contextMenu, setContextMenu] = useState<TransactionContextMenuState | null>(null);
    const { user } = useFinanceSession();
    const detailFlags = useTransactionDetailFlags(user?.uid);
    const { openModal } = useModal();
    const { updateTransactionsBulk } = useFinanceActions();
    const bulkSelection = useTransactionBulkSelection(transactions);
    const [selectionMode, setSelectionMode] = useState(false);
    const [viewPreferences, setViewPreferences] = useLocalPreferenceSection(
        user?.uid,
        TRANSACTIONS_TABLE_VIEW_PREFERENCES_SECTION,
        DEFAULT_TRANSACTIONS_TABLE_VIEW_PREFERENCES,
        normalizeTransactionsTableViewPreferences,
    );
    const { columnOrder, columnWidths, showStatus, showWallet: showWalletPreference, showDate, showDescription, showCategory, showTags, showBeneficiary, showValue } = viewPreferences;

    // Em transferências, a coluna Origem já exibe a carteira.
    const showWallet = showWalletPreference && activeTab !== "transfer";

    const columnLabels: Record<TableColumnKey, string> = {
        status: "Status",
        wallet: "Carteira",
        date: "Data",
        description: "Descrição",
        category: activeTab === "transfer" ? "Origem" : "Categoria",
        tags: "Tags",
        beneficiary: activeTab === "transfer" ? "Destino" : "Beneficiário",
        value: "Valor",
    };

    const resizeHandle = (key: TableColumnKey) => (
        <ColumnResizeHandle
            onWidthChange={(width) => setViewPreferences((current) => ({ ...current, columnWidths: { ...current.columnWidths, [key]: width } }))}
            onReset={() =>
                setViewPreferences((current) => {
                    const nextWidths = { ...current.columnWidths };
                    delete nextWidths[key];
                    return { ...current, columnWidths: nextWidths };
                })
            }
        />
    );

    const toggleViewPreference = (key: Exclude<keyof TransactionsTableViewPreferences, "columnOrder" | "columnWidths">) => {
        setViewPreferences((current) => ({
            ...current,
            [key]: !current[key],
        }));
    };

    const contextTransaction = useMemo(() => transactions.find((transaction) => transaction.id === contextMenu?.transactionId) ?? null, [contextMenu?.transactionId, transactions]);
    const contextActions = useMemo(
        () =>
            contextTransaction
                ? buildTransactionContextActions({
                      transaction: contextTransaction,
                      group: transactionGroupsById.get(contextTransaction.groupId),
                      isSelected: bulkSelection.selectedIdSet.has(contextTransaction.id),
                  })
                : [],
        [bulkSelection.selectedIdSet, contextTransaction, transactionGroupsById],
    );
    const selectedTransactions = useMemo(() => transactions.filter((transaction) => bulkSelection.selectedIdSet.has(transaction.id)), [bulkSelection.selectedIdSet, transactions]);
    const selectedTransactionsTotal = useMemo(() => selectedTransactions.reduce((sum, transaction) => sum + transaction.value, 0), [selectedTransactions]);
    const selectedTransactionsLabel = `${selectedTransactions.length} ${selectedTransactions.length === 1 ? "transacao selecionada" : "transacoes selecionadas"}`;

    useEffect(() => {
        if (contextMenu && !contextTransaction) {
            setContextMenu(null);
        }
    }, [contextMenu, contextTransaction]);

    useEffect(() => {
        if (selectionMode && bulkSelection.selectedCount < 1) {
            setSelectionMode(false);
        }
    }, [bulkSelection.selectedCount, selectionMode]);

    const handleRowContextMenu = (event: MouseEvent<HTMLTableRowElement>, transaction: Transaction) => {
        event.preventDefault();
        setContextMenu({
            transactionId: transaction.id,
            x: event.clientX,
            y: event.clientY,
        });
    };

    const handleSelectAction = (action: TransactionContextAction) => {
        if (!contextTransaction) {
            return;
        }

        setContextMenu(null);
        if (action.id === "select") {
            setSelectionMode(true);
            bulkSelection.toggleTransaction(contextTransaction.id);
            return;
        }

        onAction(contextTransaction, action);
    };

    const handleClearBulkSelection = () => {
        bulkSelection.clearSelection();
        setSelectionMode(false);
    };

    const handleOpenBulkEdit = () => {
        if (selectedTransactions.length < 1) {
            return;
        }

        openModal(<BulkTransactionEditModal transactions={selectedTransactions} context="wallet" onApplied={handleClearBulkSelection} />);
    };

    const handleMarkSelectedAsPaid = () => {
        if (selectedTransactions.length < 1) {
            return;
        }

        openModal(
            <ConfirmActionModal
                title="Marcar transacoes como pagas?"
                description={`Essa acao marca ${selectedTransactionsLabel} como pagas e atualiza os saldos vinculados.`}
                confirmLabel="Marcar como pagas"
                tone="success"
                onConfirm={async () => {
                    await updateTransactionsBulk({
                        transactionIds: selectedTransactions.map((transaction) => transaction.id),
                        status: "paid",
                    });
                    handleClearBulkSelection();
                }}
            />,
        );
    };

    const handlePaySelectedToday = () => {
        if (selectedTransactions.length < 1) {
            return;
        }

        openModal(
            <ConfirmActionModal
                title="Pagar todas hoje?"
                description={`Registra hoje o pagamento ou recebimento de ${selectedTransactionsLabel}, atualizando as datas das ocorrências e os saldos.`}
                confirmLabel="Pagar todas hoje"
                tone="success"
                onConfirm={async () => {
                    await updateTransactionsBulk({
                        transactionIds: selectedTransactions.filter((transaction) => transaction.status === "pending").map((transaction) => transaction.id),
                        status: "paid",
                        settleToday: true,
                    });
                    handleClearBulkSelection();
                }}
            />,
        );
    };

    const handleRowClick = (transaction: Transaction) => {
        if (!selectionMode || !isTransactionEligibleForBulkEdit(transaction)) {
            return;
        }

        bulkSelection.toggleTransaction(transaction.id);
    };

    return (
        <section
            className="min-w-0 flex-1 rounded-2xl finance-surface"
        >
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4">
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-base font-semibold uppercase text-white">
                        {activeTabConfig.label} <span className="mx-1.5 font-normal text-white/25">·</span><span className="font-normal capitalize text-white/45">{formatMonthLabel(selectedMonth || getCurrentMonthKey())}</span>
                    </h2>
                    <span className="text-xs text-white/40">
                        {transactions.length} {transactions.length === 1 ? "transação" : "transações"}
                        <span className="mx-1.5 text-white/20">|</span>
                        <span className="font-medium text-white/75">R$ {formatCurrencyBRL(transactions.reduce((sum, transaction) => sum + transaction.value, 0))}</span>
                    </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <TableColumnToggleBar
                        columns={columnOrder
                            .filter((key) => key !== "wallet" || activeTab !== "transfer")
                            .map((key) => ({ key, label: columnLabels[key], active: viewPreferences[COLUMN_VISIBILITY_KEY[key]] }))}
                        order={columnOrder}
                        onToggle={(key) => toggleViewPreference(COLUMN_VISIBILITY_KEY[key])}
                        onOrderChange={(nextOrder) => setViewPreferences((current) => ({ ...current, columnOrder: nextOrder }))}
                    />
                </div>
            </div>

            {transactions.length < 1 ? (
                <div className="mx-4 mb-4 rounded-xl border border-dashed border-white/[0.1] px-4 py-10 text-center">
                    <p className="text-sm text-white/70">{activeTabConfig.emptyMessage}</p>
                    <p className="mt-1 text-xs text-white/40">Troque o mês ou limpe os filtros para ver outras transações.</p>
                </div>
            ) : (
                <div className="elegant-scrollbar min-w-0 overflow-x-auto px-2 pb-2">
                    <table className="finance-table w-full max-w-full table-fixed border-separate border-spacing-0 text-sm text-white/85">
                        <colgroup>
                            {selectionMode && <col className="w-[4%]" />}
                            {columnOrder.map((column) => (
                                <Fragment key={column}>
                                    {({
                                        status: showStatus && <col style={{ width: `${columnWidths.status ?? 12}%` }} />,
                                        wallet: showWallet && <col style={{ width: `${columnWidths.wallet ?? 14}%` }} />,
                                        date: showDate && <col style={{ width: `${columnWidths.date ?? 10}%` }} />,
                                        description: showDescription && <col />,
                                        category: showCategory && <col style={{ width: `${columnWidths.category ?? 14}%` }} />,
                                        tags: showTags && <col style={{ width: `${columnWidths.tags ?? 10}%` }} />,
                                        beneficiary: showBeneficiary && <col style={{ width: `${columnWidths.beneficiary ?? 13}%` }} />,
                                        value: showValue && <col style={{ width: `${columnWidths.value ?? 12}%` }} />,
                                    } satisfies Record<TableColumnKey, ReactNode>)[column]}
                                </Fragment>
                            ))}
                        </colgroup>
                        <thead>
                            <tr>
                                {selectionMode && (
                                    <th className="border-b border-white/[0.08] px-3 py-2 text-left">
                                        <BulkHeaderCheckbox
                                            checked={bulkSelection.allVisibleSelected}
                                            indeterminate={bulkSelection.someVisibleSelected && !bulkSelection.allVisibleSelected}
                                            disabled={bulkSelection.eligibleCount < 1}
                                            onChange={bulkSelection.toggleAllVisible}
                                        />
                                    </th>
                                )}
                                {columnOrder.map((column) => (
                                    <Fragment key={column}>
                                        {({
                                            status: showStatus && <SortableHeader label="Status" field="status" sortMode={sortMode} resizeHandle={resizeHandle("status")} onSortModeChange={onSortModeChange} />,
                                            wallet: showWallet && <SortableHeader label="Carteira" field="wallet" sortMode={sortMode} resizeHandle={resizeHandle("wallet")} onSortModeChange={onSortModeChange} />,
                                            date: showDate && <SortableHeader label="Data" field="date" sortMode={sortMode} resizeHandle={resizeHandle("date")} onSortModeChange={onSortModeChange} />,
                                            description: showDescription && <SortableHeader label="Descrição" field="description" sortMode={sortMode} onSortModeChange={onSortModeChange} />,
                                            category: showCategory && <SortableHeader label={activeTab === "transfer" ? "Origem" : "Categoria"} field="category" sortMode={sortMode} resizeHandle={resizeHandle("category")} onSortModeChange={onSortModeChange} />,
                                            tags: showTags && (
                                        <th className="relative overflow-hidden whitespace-nowrap border-b border-white/[0.08] px-3 py-2 text-left text-[11px] uppercase tracking-[0.08em] text-white/45">Tags{resizeHandle("tags")}</th>
                                    ),
                                            beneficiary: showBeneficiary && (
                                        <SortableHeader label={activeTab === "transfer" ? "Destino" : "Beneficiário"} field="beneficiary" sortMode={sortMode} resizeHandle={resizeHandle("beneficiary")} onSortModeChange={onSortModeChange} />
                                    ),
                                            value: showValue && <SortableHeader label="Valor" field="value" sortMode={sortMode} align="right" resizeHandle={resizeHandle("value")} onSortModeChange={onSortModeChange} />,
                                        } satisfies Record<TableColumnKey, ReactNode>)[column]}
                                    </Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((transaction) => {
                                const group = transactionGroupsById.get(transaction.groupId);
                                const seriesIndicator = resolveTransactionSeriesIndicator(transaction, group);
                                const wallet = resolveTransactionWallet(wallets, transaction.inWallet);
                                const destinationWallet = transaction.destinationWalletId ? resolveTransactionWallet(wallets, transaction.destinationWalletId) : null;
                                const typeMeta = getTransactionTypeMeta(transaction.type);
                                const categoryDisplay = getTransactionCategoryDisplay(transaction.category);
                                const CategoryIcon = getCategoryIconComponent(categoryDisplay.icon, categoryDisplay.type);
                                const categoryColor = categoryDisplay.color ?? "#9CA3AF";
                                const categoryBackground = `${categoryColor}22`;
                                const beneficiary = transaction.beneficiaryId ? beneficiariesById.get(transaction.beneficiaryId) : null;
                                const visibleTags = transaction.tags.slice(0, 2);
                                const hiddenTagsCount = Math.max(transaction.tags.length - visibleTags.length, 0);
                                const canBulkEdit = isTransactionEligibleForBulkEdit(transaction);
                                const isSelected = bulkSelection.selectedIdSet.has(transaction.id);
                                const isPendingCardSpending = transaction.status === "pending" && transaction.paymentMethod === "credit_card";
                                const statusBadgeClass = isPendingCardSpending
                                    ? transaction.commitment === "forecast" ? STATUS_BADGE_CLASS.pending : STATUS_BADGE_CLASS.paid
                                    : STATUS_BADGE_CLASS[transaction.status];
                                const statusLabel = isPendingCardSpending
                                    ? transaction.commitment === "forecast" ? "Previsto" : "Lançado"
                                    : transaction.status === "pending" && transaction.isProjected ? "Prevista" : STATUS_LABELS[transaction.status];

                                return (
                                    <tr
                                        key={transaction.id}
                                        data-transaction-id={transaction.id}
                                        onClick={() => handleRowClick(transaction)}
                                        onContextMenu={(event) => handleRowContextMenu(event, transaction)}
                                        className={`${selectionMode && canBulkEdit ? "cursor-pointer" : "cursor-context-menu"} transition-colors ${
                                            selectionMode && !canBulkEdit ? "opacity-45" : ""
                                        }`}
                                        aria-selected={selectionMode ? isSelected : undefined}
                                    >
                                        {selectionMode && (
                                            <td className="border-b border-white/[0.04] px-3 py-2.5">
                                                <BulkRowCheckbox
                                                    checked={isSelected}
                                                    disabled={!canBulkEdit}
                                                    title={canBulkEdit ? "Selecionar transação" : "Pagamentos de fatura nao podem ser editados em massa"}
                                                    onChange={() => bulkSelection.toggleTransaction(transaction.id)}
                                                />
                                            </td>
                                        )}
                                        {columnOrder.map((column) => (
                                            <Fragment key={column}>
                                                {({
                                                    status: showStatus && (
                                                <td className="overflow-hidden whitespace-nowrap border-b border-white/[0.04] px-3 py-2.5">
                                                    <div className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
                                                        <span
                                                            className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]/4 font-medium ${statusBadgeClass}`}
                                                        >
                                                            {statusLabel}
                                                        </span>
                                                        {seriesIndicator?.kind === "installment" && <span className="text-xs text-white/45">{seriesIndicator.label}</span>}
                                                        {seriesIndicator?.kind === "recurring" && (
                                                            <span className="inline-flex text-white/45" role="img" title="Transacao recorrente" aria-label="Transacao recorrente">
                                                                <Repeat2 strokeWidth={2} size={15} />
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            ),
                                                    wallet: showWallet && (
                                                <td className="overflow-hidden border-b border-white/[0.04] px-3 py-2.5">
                                                    <WalletTableCell wallet={wallet} />
                                                </td>
                                            ),
                                                    date: showDate && (
                                                <td className="overflow-hidden whitespace-nowrap border-b border-white/[0.04] px-3 py-2.5">
                                                    <span className="font-medium text-white/85">{formatTransactionDate(transaction.date, "dd")}</span>
                                                    <span className="text-white/40">{formatTransactionDate(transaction.date, "/MM/yyyy")}</span>
                                                </td>
                                            ),
                                                    description: showDescription && (
                                                <td className="truncate border-b border-white/[0.04] px-3 py-2.5 text-[14px] font-medium text-white">
                                                    <div className="flex min-w-0 max-w-full items-center gap-1.5">
                                                        <span className="truncate">{transaction.description || "Sem descrição."}</span>
                                                        <TransactionDetailIndicators flags={detailFlags} transactionId={transaction.id} />
                                                        {transaction.systemKind === "invoice_payment" && (
                                                            <span className="inline-flex shrink-0 text-violet-300" role="img" title="Pagamento vinculado à fatura" aria-label="Pagamento vinculado à fatura">
                                                                <Link size={13} />
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            ),
                                                    category: showCategory && (
                                                <td className="overflow-hidden whitespace-nowrap border-b border-white/[0.04] px-3 py-2.5 text-white/70">
                                                    {transaction.type === "transfer" ? (
                                                        <WalletTableCell wallet={wallet} />
                                                    ) : (
                                                        <div className="flex min-w-0 max-w-full items-center gap-2">
                                                            <span
                                                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                                                                style={{ color: categoryColor, backgroundColor: categoryBackground }}
                                                            >
                                                                <CategoryIcon size={14} />
                                                            </span>
                                                            <span className="truncate">{getTransactionCategoryDisplayLabel(transaction.category)}</span>
                                                        </div>
                                                    )}
                                                </td>
                                            ),
                                                    tags: showTags && (
                                                <td className="overflow-hidden whitespace-nowrap border-b border-white/[0.04] px-3 py-2.5 text-white/70">
                                                    {visibleTags.length < 1 ? (
                                                        <span className="text-white/25">—</span>
                                                    ) : (
                                                        <div className="flex min-w-0 max-w-full flex-nowrap items-center gap-1.5 overflow-hidden">
                                                            {visibleTags.map((tag) => (
                                                                <span
                                                                    key={tag.id}
                                                                    className="min-w-0 max-w-[96px] truncate rounded-md px-2 py-0.5 text-[11px]/4 font-medium uppercase text-white/80"
                                                                    style={{ backgroundColor: `${tag.color ?? "#64748B"}26` }}
                                                                >
                                                                    {tag.name}
                                                                </span>
                                                            ))}
                                                            {hiddenTagsCount > 0 && (
                                                                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-white/55">
                                                                    +{hiddenTagsCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            ),
                                                    beneficiary: showBeneficiary && (
                                                <td className="overflow-hidden whitespace-nowrap border-b border-white/[0.04] px-3 py-2.5 text-white/70">
                                                    {transaction.type === "transfer" ? (
                                                        destinationWallet ? (
                                                            <WalletTableCell wallet={destinationWallet} />
                                                        ) : (
                                                            <NoDestinationWalletCell />
                                                        )
                                                    ) : (
                                                        <div className="flex min-w-0 max-w-full items-center gap-2 text-white/70">
                                                            <BeneficiaryAvatar
                                                                beneficiary={{
                                                                    name: beneficiary?.name ?? "Beneficiário",
                                                                    avatarImage: beneficiary?.avatarImage ?? null,
                                                                    avatarColor: beneficiary?.avatarColor ?? "#374151",
                                                                }}
                                                            />
                                                            <span className="truncate">{beneficiary?.name?.split(" ")?.[0] ?? ""}</span>
                                                        </div>
                                                    )}
                                                </td>
                                            ),
                                                    value: showValue && (
                                                <td className={`overflow-hidden whitespace-nowrap border-b border-white/[0.04] px-3 py-2.5 text-right font-semibold ${typeMeta.amountColorClass}`}>
                                                    <span className="mr-1 text-xs font-normal opacity-50">R$</span>
                                                    {formatCurrencyBRL(transaction.value)}
                                                </td>
                                            ),
                                                } satisfies Record<TableColumnKey, ReactNode>)[column]}
                                            </Fragment>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <FloatingTransactionBulkFooter
                        selectedCount={bulkSelection.selectedCount}
                        selectedAmount={formatCurrencyBRL(selectedTransactionsTotal)}
                        onEdit={handleOpenBulkEdit}
                        onMarkAsPaid={handleMarkSelectedAsPaid}
                        onPayToday={handlePaySelectedToday}
                        onClear={handleClearBulkSelection}
                    />
                    <TransactionContextMenu state={contextMenu} actions={contextActions} onSelect={handleSelectAction} onClose={() => setContextMenu(null)} />
                </div>
            )}
        </section>
    );
}

export function TransactionsListPanel({
    activeTab,
    incomeTransactions,
    spendingTransactions,
    transferTransactions,
    wallets,
    sortMode,
    onSortModeChange,
    onAction,
    selectedMonth,
}: TransactionsListPanelProps) {
    const beneficiaries = useFinanceBeneficiaries();
    const transactionGroups = useFinanceTransactionGroups();

    const beneficiariesById = useMemo(() => {
        const map = new Map<string, Beneficiary>();
        beneficiaries.forEach((beneficiary) => {
            map.set(beneficiary.id, beneficiary);
        });
        return map;
    }, [beneficiaries]);

    const transactionGroupsById = useMemo(() => {
        const map = new Map<string, FinanceTransactionGroup>();
        transactionGroups.forEach((group) => {
            map.set(group.id, group);
        });
        return map;
    }, [transactionGroups]);

    const tabs = useMemo<TabConfig[]>(
        () => [
            {
                key: "income",
                label: "Receitas",
                transactions: incomeTransactions,
                emptyMessage: "Nenhuma receita neste mês para os filtros selecionados.",
            },
            {
                key: "spending",
                label: "Despesas",
                transactions: spendingTransactions,
                emptyMessage: "Nenhuma despesa neste mês para os filtros selecionados.",
            },
            {
                key: "transfer",
                label: "Transferências",
                transactions: transferTransactions,
                emptyMessage: "Nenhuma transferência neste mês para os filtros selecionados.",
            },
        ],
        [incomeTransactions, spendingTransactions, transferTransactions],
    );

    return (
        <div className="flex w-full min-w-0 flex-col gap-3">
            <TransactionsTable
                tabs={tabs}
                activeTab={activeTab}
                selectedMonth={selectedMonth}
                wallets={wallets}
                beneficiariesById={beneficiariesById}
                transactionGroupsById={transactionGroupsById}
                sortMode={sortMode}
                onSortModeChange={onSortModeChange}
                onAction={onAction}
            />
        </div>
    );
}
