import { ArrowDownRight, ArrowRightLeft, ArrowUpRight, CalendarClock, CreditCard as CreditCardIcon, Gift, Search } from "lucide-react";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import type { PlanningWishlistSelection, WishItem } from "../../../context/FinanceContext";
import type { IncomeItem, InheritedExpenseItem, MonthProjection, PlanningPanel, SimulatedExpenseItem, SimulatedIncomeItem } from "./planningTimelineTypes";
import { IconTextField } from "../../transactions/IconTextField";
import { PlanningDetailsHeader } from "./PlanningDetailsHeader";
import { PlanningDetailsSection } from "./PlanningDetailsSection";
import { PlanningListRow } from "./PlanningListRow";
import { PlanningProjectionContextMenu, type PlanningProjectionContextMenuState } from "./PlanningProjectionContextMenu";
import { buildPlanningProjectionContextActions, type PlanningProjectionContextAction } from "./planningProjectionContextActions";
import { PlanningToggleRow } from "./PlanningToggleRow";

interface PlanningDetailsAsideProps {
    selectedMonth: MonthProjection | null;
    fallbackMonth: MonthProjection | null;
    selectedPanel: PlanningPanel;
    activeWishItems: WishItem[];
    wishlistSelectionByWishItemId: Map<string, PlanningWishlistSelection>;
    onAddIncome: (month: MonthProjection) => void;
    onDeleteExpense: (expenseId: string) => void;
    onDeleteIncome: (income: SimulatedIncomeItem) => void;
    onEditExpense: (expense: SimulatedExpenseItem) => void;
    onEditIncome: (income: SimulatedIncomeItem) => void;
    onEditWishlistItem: (wishItemId: string) => void;
    onOpenTransaction: (transactionId: string) => void;
    onOpenInvoice: (invoiceId: string) => void;
    onMoveInvoice: (item: InheritedExpenseItem) => void;
    onRestoreInvoiceMonth: (invoiceId: string) => void;
    onToggleExpense: (expenseId: string) => void;
    onToggleIncome: (incomeId: string) => void;
    onToggleSimulatedIncome: (income: SimulatedIncomeItem) => void;
    onToggleInheritedExpense: (expenseId: string) => void;
    onToggleWishlistSelection: (wishItemId: string) => void;
}

type PlanningProjectionContextTarget =
    | {
          itemType: "income";
          variant: "normal";
          item: IncomeItem;
      }
    | {
          itemType: "income";
          variant: "projected";
          item: SimulatedIncomeItem;
      }
    | {
          itemType: "expense";
          variant: "normal";
          item: InheritedExpenseItem;
      }
    | {
          itemType: "expense";
          variant: "projected";
          item: SimulatedExpenseItem;
      }
    | {
          itemType: "wishlist";
          wishItemId: string;
          isActive: boolean;
      };

type PlanningProjectionContextState = PlanningProjectionContextMenuState & {
    target: PlanningProjectionContextTarget;
};

const EMPTY_STATE_CLASS_NAME = "rounded-lg border border-dashed border-white/[0.1] px-3 py-6 text-center text-sm text-white/50";

function normalizeSearchText(value: string): string {
    return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function getPanelTitle(panel: PlanningPanel): string {
    if (panel === "income") {
        return "Receitas";
    }

    if (panel === "inherited_expenses") {
        return "Despesas";
    }

    return "Projeções";
}

export function PlanningDetailsAside({
    selectedMonth,
    fallbackMonth,
    selectedPanel,
    activeWishItems,
    wishlistSelectionByWishItemId,
    onAddIncome,
    onDeleteExpense,
    onDeleteIncome,
    onEditExpense,
    onEditIncome,
    onEditWishlistItem,
    onOpenTransaction,
    onOpenInvoice,
    onMoveInvoice,
    onRestoreInvoiceMonth,
    onToggleExpense,
    onToggleIncome,
    onToggleSimulatedIncome,
    onToggleInheritedExpense,
    onToggleWishlistSelection,
}: PlanningDetailsAsideProps) {
    const [contextMenuState, setContextMenuState] = useState<PlanningProjectionContextState | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const normalizedQuery = normalizeSearchText(searchQuery.trim());
    const matchesSearch = (label: string) => !normalizedQuery || normalizeSearchText(label).includes(normalizedQuery);
    const selectedPanelTitle = getPanelTitle(selectedPanel);
    const contextMenuActions = useMemo(() => {
        if (!contextMenuState) {
            return [];
        }

        const target = contextMenuState.target;
        const isActive = target.itemType === "wishlist" ? target.isActive : !target.item.isDisabled;
        const isNormalItem = target.itemType !== "wishlist" && target.variant === "normal";
        const isNormalExpenseInvoice = isNormalItem && target.itemType === "expense" && target.item.source === "invoice";
        const isNormalTransfer = isNormalItem && target.item.source === "transfer";
        const invoiceItem = target.itemType === "expense" && target.variant === "normal" && target.item.source === "invoice" ? target.item : null;
        const isGhostInvoice = Boolean(invoiceItem?.movedToMonthKey);
        const isMovedInvoice = isGhostInvoice || (invoiceItem?.dueMonthKey !== undefined && invoiceItem.dueMonthKey !== selectedMonth?.monthKey);

        return buildPlanningProjectionContextActions({
            itemType: target.itemType,
            isActive,
            canToggle: !isGhostInvoice,
            canRemove: !isNormalItem && target.itemType !== "wishlist",
            canMove: isNormalExpenseInvoice,
            canRestore: isMovedInvoice,
            editLabel: isNormalItem
                ? isNormalExpenseInvoice
                    ? "Abrir fatura"
                    : isNormalTransfer
                      ? "Abrir transferência"
                      : target.itemType === "income"
                        ? "Abrir receita"
                        : "Abrir despesa"
                : undefined,
        });
    }, [contextMenuState, selectedMonth?.monthKey]);

    useEffect(() => {
        setContextMenuState(null);
    }, [selectedMonth?.monthKey, selectedPanel]);

    useEffect(() => {
        setSearchQuery("");
    }, [selectedPanel]);

    const handleProjectionContextMenu = (event: MouseEvent, target: PlanningProjectionContextTarget) => {
        event.preventDefault();
        setContextMenuState({
            itemId: target.itemType === "wishlist" ? target.wishItemId : target.item.id,
            target,
            x: event.clientX,
            y: event.clientY,
        });
    };

    const handleProjectionContextActionSelect = (action: PlanningProjectionContextAction) => {
        if (!contextMenuState) {
            return;
        }

        const target = contextMenuState.target;
        setContextMenuState(null);

        if (target.itemType === "income") {
            if (action.id === "toggle") {
                if (target.variant === "normal") {
                    onToggleIncome(target.item.id);
                    return;
                }

                onToggleSimulatedIncome(target.item);
                return;
            }
            if (action.id === "edit") {
                if (target.variant === "normal") {
                    onOpenTransaction(target.item.transactionId);
                    return;
                }

                onEditIncome(target.item);
                return;
            }
            if (target.variant === "projected" && action.id === "remove") {
                onDeleteIncome(target.item);
            }
            return;
        }

        if (target.itemType === "expense") {
            if (action.id === "toggle") {
                if (target.variant === "normal") {
                    onToggleInheritedExpense(target.item.id);
                    return;
                }

                onToggleExpense(target.item.id);
                return;
            }
            if (action.id === "edit") {
                if (target.variant === "normal") {
                    if (target.item.source === "invoice" && target.item.invoiceId) {
                        onOpenInvoice(target.item.invoiceId);
                    } else if (target.item.transactionId) {
                        onOpenTransaction(target.item.transactionId);
                    }
                    return;
                }

                onEditExpense(target.item);
                return;
            }
            if (action.id === "move" && target.variant === "normal") {
                onMoveInvoice(target.item);
                return;
            }
            if (action.id === "restore" && target.variant === "normal" && target.item.invoiceId) {
                onRestoreInvoiceMonth(target.item.invoiceId);
                return;
            }
            if (target.variant === "projected" && action.id === "remove") {
                onDeleteExpense(target.item.id);
            }
            return;
        }

        if (action.id === "toggle") {
            onToggleWishlistSelection(target.wishItemId);
            return;
        }

        if (action.id === "edit") {
            onEditWishlistItem(target.wishItemId);
        }
    };

    const renderContent = () => {
        if (!selectedMonth) {
            return <p className={EMPTY_STATE_CLASS_NAME}>Nenhum mês disponível para planejar.</p>;
        }

        const incomeItems = selectedMonth.incomeItems.filter((item) => matchesSearch(item.label));
        const inheritedItems = selectedMonth.inheritedItems.filter((item) => matchesSearch(item.label));
        const movedInvoiceItems = selectedMonth.movedInvoiceItems.filter((item) => matchesSearch(item.label));
        const simulatedIncomeItems = selectedMonth.simulatedIncomeItems.filter((item) => matchesSearch(item.label));
        const simulatedExpenseItems = selectedMonth.simulatedExpenseItems.filter((item) => matchesSearch(item.description));
        const wishItems = activeWishItems.filter((item) => matchesSearch(item.description.trim() || "Desejo"));
        const noResults = normalizedQuery ? <p className={EMPTY_STATE_CLASS_NAME}>Nada encontrado para “{searchQuery.trim()}”.</p> : null;

        if (selectedPanel === "income") {
            return (
                <>
                    {selectedMonth.incomeItems.length > 0 && incomeItems.length === 0 ? noResults : null}
                    {selectedMonth.incomeItems.length === 0 ? <p className={EMPTY_STATE_CLASS_NAME}>Nenhuma receita prevista para este mês.</p> : null}
                    {incomeItems.map((item) => (
                        <PlanningToggleRow
                            key={item.id}
                            toggleId={item.id}
                            label={item.label}
                            amount={item.amount}
                            iconName={item.iconName}
                            iconTone="income"
                            customIcon={item.source === "transfer" ? ArrowRightLeft : undefined}
                            active={!item.isDisabled}
                            onToggle={onToggleIncome}
                            onContextMenu={(event) =>
                                handleProjectionContextMenu(event, {
                                    itemType: "income",
                                    variant: "normal",
                                    item,
                                })
                            }
                        />
                    ))}
                </>
            );
        }

        if (selectedPanel === "inherited_expenses") {
            return (
                <>
                    {selectedMonth.inheritedItems.length + selectedMonth.movedInvoiceItems.length > 0 && inheritedItems.length + movedInvoiceItems.length === 0 ? noResults : null}
                    {selectedMonth.inheritedItems.length === 0 && selectedMonth.movedInvoiceItems.length === 0 ? <p className={EMPTY_STATE_CLASS_NAME}>Nenhuma despesa prevista para este mês.</p> : null}
                    {inheritedItems.map((item) => (
                        <PlanningToggleRow
                            key={item.id}
                            toggleId={item.id}
                            label={item.label}
                            amount={item.amount}
                            iconName={item.iconName}
                            iconTone="expense"
                            active={!item.isDisabled}
                            onToggle={onToggleInheritedExpense}
                            customIcon={item.source === "invoice" ? CreditCardIcon : item.source === "transfer" ? ArrowRightLeft : undefined}
                            onContextMenu={(event) =>
                                handleProjectionContextMenu(event, {
                                    itemType: "expense",
                                    variant: "normal",
                                    item,
                                })
                            }
                        />
                    ))}
                    {movedInvoiceItems.map((item) => (
                        <PlanningListRow
                            key={item.id}
                            active={false}
                            label={item.label}
                            amount={item.amount}
                            iconName={null}
                            iconTone="expense"
                            customIcon={CalendarClock}
                                                        onContextMenu={(event) =>
                                handleProjectionContextMenu(event, {
                                    itemType: "expense",
                                    variant: "normal",
                                    item,
                                })
                            }
                        />
                    ))}
                </>
            );
        }

        const hasProjectionItems = selectedMonth.simulatedIncomeItems.length + selectedMonth.simulatedExpenseItems.length + activeWishItems.length > 0;
        const hasSimulatedIncomes = simulatedIncomeItems.length > 0;
        const hasSimulatedExpenses = simulatedExpenseItems.length > 0;
        const hasWishlistItems = wishItems.length > 0;

        return (
            <>
                {hasProjectionItems && !hasSimulatedIncomes && !hasSimulatedExpenses && !hasWishlistItems ? noResults : null}
                {!hasProjectionItems ? <p className={EMPTY_STATE_CLASS_NAME}>Nenhuma projeção neste mês. Use “Nova receita” para simular uma entrada.</p> : null}

                {hasSimulatedIncomes ? (
                    <PlanningDetailsSection title="Receitas" tone="income">
                        {simulatedIncomeItems.map((item) => (
                            <PlanningListRow
                                key={item.id}
                                active={!item.isDisabled}
                                label={item.label}
                                amount={item.amount}
                                iconName={item.iconName}
                                iconTone="income"
                                customIcon={ArrowUpRight}
                                valueClassName={item.amount < 0 ? "text-red-200" : undefined}
                                onClick={item.source === "simulated_income" ? () => onToggleSimulatedIncome(item) : undefined}
                                onContextMenu={
                                    item.source === "simulated_income"
                                        ? (event) =>
                                              handleProjectionContextMenu(event, {
                                                  itemType: "income",
                                                  variant: "projected",
                                                  item,
                                              })
                                        : undefined
                                }
                            />
                        ))}
                    </PlanningDetailsSection>
                ) : null}

                {hasSimulatedExpenses ? (
                    <PlanningDetailsSection title="Despesas" tone="expense">
                        {simulatedExpenseItems.map((expense) => (
                            <PlanningListRow
                                key={expense.id}
                                active={!expense.isDisabled}
                                label={expense.installmentNumber ? `${expense.description} (${expense.installmentNumber}/${expense.installmentCount})` : expense.description}
                                amount={expense.amount}
                                iconName={null}
                                iconTone="expense"
                                customIcon={ArrowDownRight}
                                
                                onClick={() => onToggleExpense(expense.id)}
                                onContextMenu={(event) =>
                                    handleProjectionContextMenu(event, {
                                        itemType: "expense",
                                        variant: "projected",
                                        item: expense,
                                    })
                                }
                            />
                        ))}
                    </PlanningDetailsSection>
                ) : null}

                {hasWishlistItems ? (
                    <PlanningDetailsSection title="Lista de desejos" tone="wishlist">
                        {wishItems.map((item) => {
                            const selection = wishlistSelectionByWishItemId.get(item.id);
                            return (
                                <PlanningToggleRow
                                    key={item.id}
                                    toggleId={item.id}
                                    label={item.description.trim() || "Desejo"}
                                    amount={item.value}
                                    iconName={null}
                                    iconTone="wishlist"
                                    customIcon={Gift}
                                    active={selection?.monthKey === selectedMonth.monthKey}
                                    onToggle={onToggleWishlistSelection}
                                    onContextMenu={(event) =>
                                        handleProjectionContextMenu(event, {
                                            itemType: "wishlist",
                                            wishItemId: item.id,
                                            isActive: selection?.monthKey === selectedMonth.monthKey,
                                        })
                                    }
                                />
                            );
                        })}
                    </PlanningDetailsSection>
                ) : null}
            </>
        );
    };

    return (
        <>
            <aside
                className="flex max-h-[calc(100vh-2rem)] w-full shrink-0 flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-surface p-4 text-left xl:sticky xl:top-4 xl:max-w-[360px]"
            >
            <PlanningDetailsHeader
                title={selectedPanelTitle}
                monthLabel={selectedMonth?.monthLabel ?? fallbackMonth?.monthLabel ?? "Mês atual"}
                panel={selectedPanel}
                month={selectedMonth}
                onAddIncome={selectedPanel === "projections" && selectedMonth ? () => onAddIncome(selectedMonth) : undefined}
            />
            <div className="mt-4 shrink-0">
                <IconTextField ariaLabel="Buscar itens" value={searchQuery} onChange={setSearchQuery} placeholder="Buscar pelo nome" icon={Search} bareIcon />
            </div>
            <div className={`ghost-scrollbar ghost-scrollbar--edge-aware -mr-1 mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1`}>
                {renderContent()}
            </div>
            </aside>
            <PlanningProjectionContextMenu state={contextMenuState} actions={contextMenuActions} onSelect={handleProjectionContextActionSelect} onClose={() => setContextMenuState(null)} />
        </>
    );
}
