import { useRef, type KeyboardEvent } from "react";
import { WalletAvatar } from "../common/WalletAvatar";
import { formatMonthLabel } from "../pages/transactions/transactionsPageShared";
import { formatCurrencyBRL, formatTransactionDate } from "../transactions/transactionView";
import type { WalletCardPayments } from "./cardPaymentsByWallet";

export type CardPaymentsChoiceValue = "keep" | "delete";

const OPTIONS: Array<{ id: CardPaymentsChoiceValue; label: string; description: string }> = [
    { id: "keep", label: "Manter nas carteiras", description: "Viram despesas comuns. Os saldos não mudam." },
    { id: "delete", label: "Apagar tudo", description: "Os pagamentos somem e o dinheiro volta para as carteiras." },
];

interface CardPaymentsChoiceProps {
    walletPayments: WalletCardPayments[];
    value: CardPaymentsChoiceValue;
    onChange: (value: CardPaymentsChoiceValue) => void;
    disabled?: boolean;
}

/** A lista abaixo das opções mostra o efeito da escolha em cada carteira. */
export function CardPaymentsChoice({ walletPayments, value, onChange, disabled = false }: CardPaymentsChoiceProps) {
    const groupRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = (event: KeyboardEvent) => {
        if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) {
            return;
        }

        event.preventDefault();
        const next = value === "keep" ? "delete" : "keep";
        onChange(next);
        groupRef.current?.querySelector<HTMLElement>(`[data-choice="${next}"]`)?.focus();
    };

    return (
        <>
            <div ref={groupRef} role="radiogroup" aria-label="Pagamentos das faturas" onKeyDown={handleKeyDown} className="mt-4 grid gap-2 sm:grid-cols-2">
                {OPTIONS.map((option) => {
                    const selected = option.id === value;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            role="radio"
                            data-choice={option.id}
                            aria-checked={selected}
                            tabIndex={selected ? 0 : -1}
                            disabled={disabled}
                            onClick={() => onChange(option.id)}
                            className={`flex gap-2.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-60 ${
                                selected ? "border-white/40 bg-white/[0.06]" : "border-white/[0.08] hover:bg-white/[0.03]"
                            }`}
                        >
                            <span aria-hidden className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-white" : "border-white/35"}`}>
                                {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-medium text-white">{option.label}</span>
                                <span className="mt-0.5 block text-xs leading-5 text-white/55">{option.description}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-5 divide-y divide-white/[0.07]">
                {walletPayments.map((item) => (
                    <WalletPaymentsSection key={item.wallet.id} item={item} deleting={value === "delete"} />
                ))}
            </div>
        </>
    );
}

function WalletPaymentsSection({ item, deleting }: { item: WalletCardPayments; deleting: boolean }) {
    const { wallet, payments, total } = item;

    return (
        <section className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2.5">
                <WalletAvatar wallet={wallet} className="h-8 w-8 rounded-lg border border-white/[0.12]" iconSize={15} />
                <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-medium text-white">{wallet.name}</h4>
                    <p aria-live="polite" className="text-xs tabular-nums text-white/55">
                        {deleting ? (
                            <>
                                Saldo vai de R$ {formatCurrencyBRL(wallet.balance)} para <span className="font-medium text-amber-200">R$ {formatCurrencyBRL(wallet.balance + total)}</span>
                            </>
                        ) : (
                            <>Saldo continua R$ {formatCurrencyBRL(wallet.balance)}</>
                        )}
                    </p>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-white">R$ {formatCurrencyBRL(total)}</p>
                    <p className="text-xs text-white/55">{payments.length === 1 ? "1 pagamento" : `${payments.length} pagamentos`}</p>
                </div>
            </div>

            <ul className={`mt-2 space-y-1 pl-[42px] text-sm transition-colors motion-reduce:transition-none ${deleting ? "text-white/45 line-through" : "text-white/75"}`}>
                {payments.map((payment) => (
                    <li key={payment.id} className="flex items-baseline gap-3">
                        <span className="w-[76px] shrink-0 tabular-nums">{formatTransactionDate(payment.date, "dd/MM/yyyy")}</span>
                        <span className="min-w-0 flex-1 truncate">{payment.invoiceMonth ? `Fatura de ${formatMonthLabel(payment.invoiceMonth).toLowerCase()}` : "Pagamento de fatura"}</span>
                        <span className="shrink-0 tabular-nums">R$ {formatCurrencyBRL(payment.amount)}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
