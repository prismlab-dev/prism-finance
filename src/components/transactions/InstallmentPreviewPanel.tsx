import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { parseDateOnlyToLocalDate } from "../../lib/localDate";
import { extractCurrencyDigits, formatCurrencyFromDigits, parseCurrencyDigitsToNumber } from "../../lib/currencyMask";
import { InfoTag } from "./InfoTag";
import { InstallmentPlanWarning } from "./InstallmentPlanWarning";
import type { InstallmentPlan, InstallmentPreviewRow } from "./installmentPreview";
import { formatCurrencyBRL } from "./transactionView";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" });
const dayFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

/** Curto para caber em uma linha: "dez 2026" ou "30/12/26". */
function formatDate(date: string, showDay: boolean): string {
    const parsed = parseDateOnlyToLocalDate(date);
    if (!parsed) return date;
    return showDay ? dayFormatter.format(parsed) : monthFormatter.format(parsed).replace(". de ", " ");
}

interface StubProps {
    row: InstallmentPreviewRow;
    showDay: boolean;
    hasAmount: boolean;
    disabled: boolean;
    onAmountChange: (index: number, amount: number) => void;
}

/** Canhoto de carnê: número destacável à esquerda do picote, mês e valor editável à direita. */
function Stub({ row, showDay, hasAmount, disabled, onAmountChange }: StubProps) {
    const isEmpty = hasAmount && row.amount <= 0;

    return (
        <li className={`relative flex shrink-0 items-stretch overflow-hidden rounded-lg text-sm ${row.ignored ? "bg-white/[0.025] text-white/50" : "bg-white/[0.07] text-white"}`}>
            <span className="flex w-11 shrink-0 items-center justify-center border-r border-dashed border-white/25 font-semibold tabular-nums">{row.number}</span>
            <span className="absolute -top-1 left-10 h-2 w-2 rounded-full bg-surface" aria-hidden="true" />
            <span className="absolute -bottom-1 left-10 h-2 w-2 rounded-full bg-surface" aria-hidden="true" />
            <span className="shrink-0 self-center py-2.5 pl-2.5 leading-tight">
                {formatDate(row.date, showDay)}
                {row.ignored ? <span className="sr-only">, ignorada</span> : null}
            </span>
            {hasAmount ? (
                <input
                    inputMode="numeric"
                    aria-label={`Valor da parcela ${row.number}`}
                    aria-invalid={isEmpty}
                    value={formatCurrencyFromDigits(String(Math.round(row.amount * 100)))}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => onAmountChange(row.number - 1, parseCurrencyDigitsToNumber(extractCurrencyDigits(event.target.value)))}
                    disabled={disabled}
                    className={`m-1 min-w-0 flex-1 rounded-md border bg-transparent px-1 text-right tabular-nums outline-none transition-colors hover:bg-black/25 focus-visible:border-white/50 focus-visible:bg-black/35 disabled:cursor-not-allowed ${
                        isEmpty ? "border-red-400/70 text-red-200" : row.manual ? "border-white/25" : "border-transparent"
                    } ${row.ignored ? "line-through" : "font-medium"}`}
                />
            ) : null}
        </li>
    );
}

export function InstallmentPreviewPanel({ plan, className = "" }: { plan: InstallmentPlan; className?: string }) {
    const { preview } = plan;
    const { rows, amountGroups, hint } = preview;

    return (
        <section aria-label="Prévia das parcelas" className={`flex min-h-0 flex-col rounded-xl border border-white/[0.09] bg-surface p-4 text-left text-white ${className}`}>
            {preview.ignoredCount > 0 ? (
                <p aria-live="polite" className="mb-3 flex shrink-0">
                    <InfoTag>{preview.ignoredCount === 1 ? "1 parcela ignorada" : `${preview.ignoredCount} parcelas ignoradas`}</InfoTag>
                </p>
            ) : null}
            {rows.length > 0 ? (
                <>
                    <div className="flex shrink-0 pr-1 text-xs text-white/50" aria-hidden="true">
                        <span className="w-11 shrink-0 text-center">Nº</span>
                        <span className="flex-1 px-2.5">{preview.showDay ? "Data" : "Fatura"}</span>
                        {amountGroups.length > 0 ? <span className="pr-2">Valor</span> : null}
                    </div>
                    <ol tabIndex={0} aria-label={preview.showDay ? "Parcelas por data" : "Parcelas por fatura"} className="elegant-scrollbar mt-1.5 flex min-h-0 flex-col gap-1.5 overflow-y-auto rounded-lg pr-1 outline-none focus-visible:ring-2 focus-visible:ring-white/30">
                        {rows.map((row) => <Stub key={row.number} row={row} showDay={preview.showDay} hasAmount={amountGroups.length > 0} disabled={plan.disabled} onAmountChange={plan.onAmountChange} />)}
                        {preview.hiddenCount > 0 ? <li className="py-2 text-center text-xs text-white/50">E mais {preview.hiddenCount} parcelas</li> : null}
                    </ol>
                </>
            ) : null}
            <footer className={`shrink-0 ${rows.length > 0 ? "mt-3 border-t border-white/[0.09] pt-3" : ""}`}>
                {amountGroups.length > 0 ? (
                    <>
                        <p className="flex items-center gap-2.5 text-sm text-white/70">
                            <span className="shrink-0">De {formatDate(rows[0].date, false)}</span>
                            <span className="h-px min-w-3 flex-1 bg-white/25" aria-hidden="true" />
                            <span className="shrink-0">até {formatDate(preview.lastDate, false)}</span>
                        </p>
                        <p className="mt-2 flex flex-col text-right text-xl leading-snug font-semibold tabular-nums">
                            {amountGroups.length <= 2 ? amountGroups.map((group) => (
                                <span key={group.amount}>{group.count}x de R$ {formatCurrencyBRL(group.amount)}</span>
                            )) : <span>{preview.count}x, R$ {formatCurrencyBRL(preview.installmentsTotal)}</span>}
                        </p>
                        <InstallmentPlanWarning plan={plan} className="mt-3" />
                    </>
                ) : (
                    <p className="text-sm leading-relaxed text-white/70">{hint}</p>
                )}
            </footer>
        </section>
    );
}

/** Versão lateral do modal; em telas menores a prévia fica dentro do formulário. */
export function InstallmentPreviewAside({ plan }: { plan: InstallmentPlan | null }) {
    const shouldReduceMotion = useReducedMotion();

    return (
        <AnimatePresence>
            {plan ? (
                <motion.div
                    className="hidden min-[1280px]:block"
                    initial={shouldReduceMotion ? false : { opacity: 0, x: -48 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, x: -32 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                    <InstallmentPreviewPanel plan={plan} className="max-h-[min(650px,calc(94vh-40px))]" />
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
