import type { InstallmentPlan } from "./installmentPreview";
import { formatCurrencyBRL } from "./transactionView";

const ACTION_CLASS = "rounded-md bg-white/[0.1] px-2 py-1 text-xs text-white transition-colors hover:bg-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50";

function describeEmpty(numbers: number[]): string {
    if (numbers.length === 1) return `A parcela ${numbers[0]} está sem valor.`;
    if (numbers.length <= 3) return `As parcelas ${numbers.slice(0, -1).join(", ")} e ${numbers[numbers.length - 1]} estão sem valor.`;
    return `${numbers.length} parcelas estão sem valor.`;
}

/** Parcela sem valor impede salvar; soma diferente do total só avisa e diz o que será salvo. */
export function InstallmentPlanWarning({ plan, className = "" }: { plan: InstallmentPlan; className?: string }) {
    const { preview, disabled } = plan;
    const isEmpty = preview.emptyNumbers.length > 0;
    const differs = preview.difference !== 0;
    if (!preview.customized) return null;

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <div role="status">
                {isEmpty ? (
                    <p className="text-sm leading-snug text-red-200">{describeEmpty(preview.emptyNumbers)} Preencha para salvar.</p>
                ) : differs ? (
                    <p className="text-sm leading-snug text-amber-200">
                        {preview.difference > 0 ? "Passa" : "Falta"} R$ {formatCurrencyBRL(Math.abs(preview.difference))} {preview.difference > 0 ? "do total" : "para o total"} de R$ {formatCurrencyBRL(preview.totalAmount)}. Se salvar assim, vale a soma: R$ {formatCurrencyBRL(preview.installmentsTotal)}.
                    </p>
                ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
                {differs && !isEmpty && preview.canSpread ? <button type="button" className={ACTION_CLASS} onClick={plan.onSpread} disabled={disabled}>Ajustar as outras</button> : null}
                {differs && !isEmpty && preview.hiddenCount === 0 ? <button type="button" className={ACTION_CLASS} onClick={plan.onUseSumAsTotal} disabled={disabled}>Usar a soma como total</button> : null}
                <button type="button" className={ACTION_CLASS} onClick={plan.onReset} disabled={disabled}>Voltar a dividir igual</button>
            </div>
        </div>
    );
}
