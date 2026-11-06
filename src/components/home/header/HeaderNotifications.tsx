import { Bell, CheckCircle2, ReceiptText, TriangleAlert } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useFinanceTransactions } from "../../../context/FinanceContext";
import { getMonthKeyFromDateValue } from "../../../context/financeTypes";
import { usePage } from "../../../context/PageContext";
import { useAttentionAlerts } from "../../pages/home/useAttentionAlerts";
import { parseAppDate } from "../../../lib/localDate";
import { formatCurrencyBRL } from "../../transactions/transactionView";

export function HeaderNotifications() {
    const { goToPage } = usePage();
    const transactions = useFinanceTransactions();
    const { overdueNonCardSpendings, overdueInvoices } = useAttentionAlerts(transactions);
    const alertCount = overdueNonCardSpendings.length + overdueInvoices.length;
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        function handleClickOutside(event: MouseEvent) {
            if (!menuRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    function go(open: () => void) {
        setIsOpen(false);
        open();
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setIsOpen((current) => !current)}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-label={alertCount > 0 ? `Notificações (${alertCount})` : "Notificações"}
                className="relative -mx-1 flex h-10 w-8 shrink-0 items-center justify-center rounded-[12px] text-white/50 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
                <Bell size={20} />
                {alertCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold tabular-nums leading-none text-white">
                        {alertCount}
                    </span>
                ) : null}
            </button>

            {isOpen ? (
                <div
                    role="dialog"
                    aria-label="Notificações"
                    className="absolute right-0 top-[calc(100%+10px)] z-30 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-white/[0.1] bg-neutral-950 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.9)]"
                >
                    <div className="flex items-baseline justify-between border-b border-white/[0.06] px-4 py-3">
                        <p className="text-sm font-medium text-white">Notificações</p>
                        {alertCount > 0 ? <span className="text-xs tabular-nums text-neutral-500">{alertCount === 1 ? "1 aviso" : `${alertCount} avisos`}</span> : null}
                    </div>
                    {alertCount < 1 ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                            <CheckCircle2 size={22} className="text-emerald-400/70" />
                            <p className="text-sm text-neutral-400">Nenhuma conta ou fatura atrasada.</p>
                        </div>
                    ) : (
                        <ul className="max-h-[60vh] divide-y divide-white/[0.05] overflow-y-auto">
                            {overdueNonCardSpendings.map((transaction) => (
                                <NotificationItem
                                    key={transaction.id}
                                    accent="bg-rose-400"
                                    icon={<TriangleAlert size={15} className="text-rose-300" />}
                                    title={transaction.description || "Sem descrição"}
                                    detail={`Conta atrasada desde ${formatDueDate(transaction.date)}`}
                                    amount={transaction.value}
                                    onClick={() =>
                                        go(() =>
                                            goToPage("transactions", {
                                                page: "transactions",
                                                tab: "spending",
                                                selectedMonth: getMonthKeyFromDateValue(transaction.date),
                                                highlightTransactionId: transaction.id,
                                            }),
                                        )
                                    }
                                />
                            ))}
                            {overdueInvoices.map((invoice) => (
                                <NotificationItem
                                    key={invoice.invoiceId}
                                    accent="bg-amber-300"
                                    icon={<ReceiptText size={15} className="text-amber-200" />}
                                    title={`Fatura de ${formatMonthName(invoice.selectedMonth)}`}
                                    detail={`Fatura do ${invoice.cardName} vencida em ${formatDueDate(invoice.dueDate)}`}
                                    amount={invoice.openAmount}
                                    onClick={() =>
                                        go(() => goToPage("statement", { page: "statement", selectedCardId: invoice.cardId, selectedMonth: invoice.selectedMonth }))
                                    }
                                />
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}
        </div>
    );
}

interface NotificationItemProps {
    accent: string;
    icon: ReactNode;
    title: string;
    detail: string;
    amount: number;
    onClick: () => void;
}

function NotificationItem({ accent, icon, title, detail, amount, onClick }: NotificationItemProps) {
    return (
        <li>
            <button
                type="button"
                onClick={onClick}
                className="relative flex w-full gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.06]"
            >
                <span aria-hidden className={`absolute inset-y-3 left-0 w-0.5 rounded-r ${accent}`} />
                <span className="mt-0.5 shrink-0">{icon}</span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{title}</span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-500">{detail}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-white/80">R$ {formatCurrencyBRL(amount)}</span>
            </button>
        </li>
    );
}

function formatDueDate(dateValue: string): string {
    return parseAppDate(dateValue)?.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) ?? dateValue;
}

function formatMonthName(monthKey: string): string {
    const [year, month] = monthKey.split("-").map(Number);
    const name = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
    return name.charAt(0).toUpperCase() + name.slice(1);
}
