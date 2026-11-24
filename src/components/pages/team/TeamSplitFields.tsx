import type { TeamSplitMode } from "../../../context/finance/teamExpense";
import type { TeamMember } from "../../../context/teamTypes";
import { BeneficiaryAvatar } from "../../common/BeneficiaryAvatar";
import { formatReportCurrency } from "../planning/planningReportFormatting";

const SPLIT_MODES: { mode: TeamSplitMode; label: string }[] = [
    { mode: "equal", label: "Igual" },
    { mode: "percent", label: "Porcentagem" },
    { mode: "fixed", label: "Valor fixo" },
    { mode: "team", label: "100% equipe" },
];

export interface TeamSplitMemberState {
    included: boolean;
    value: string;
    /** Recebimento já confirmado desta parte; guardado na própria despesa. */
    paidAt?: string;
}

interface TeamSplitFieldsProps {
    members: TeamMember[];
    total: number;
    mode: TeamSplitMode;
    onModeChange: (mode: TeamSplitMode) => void;
    state: Record<string, TeamSplitMemberState>;
    onStateChange: (memberId: string, next: TeamSplitMemberState) => void;
    disabled?: boolean;
}

function parseInput(value: string): number {
    return Number(value.replace(",", ".")) || 0;
}

/** Quanto falta (positivo) ou sobra (negativo) para a divisão fechar, na unidade do modo. */
function remainderOf(mode: TeamSplitMode, total: number, values: number[]): number {
    const sum = values.reduce((acc, value) => acc + value, 0);
    return Math.round(((mode === "percent" ? 100 : total) - sum) * 100) / 100;
}

export function TeamSplitFields({ members, total, mode, onModeChange, state, onStateChange, disabled = false }: TeamSplitFieldsProps) {
    const included = members.filter((member) => state[member.uid]?.included);
    const shareOf = (memberId: string): number => {
        const value = parseInput(state[memberId]?.value ?? "");
        if (mode === "equal") return included.length ? total / included.length : 0;
        return mode === "percent" ? (total * value) / 100 : value;
    };
    const remainder = remainderOf(mode, total, included.map((member) => parseInput(state[member.uid]?.value ?? "")));
    const needsValues = mode === "percent" || mode === "fixed";
    const distributed = needsValues ? Math.min(1, Math.max(0, 1 - remainder / (mode === "percent" ? 100 : total || 1))) : 1;
    const unit = (value: number) => (mode === "percent" ? `${value.toLocaleString("pt-BR")}%` : formatReportCurrency(value));

    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.1] bg-black/35 p-1 sm:grid-cols-4" role="radiogroup" aria-label="De quem é o custo">
                {SPLIT_MODES.map((item) => (
                    <button
                        key={item.mode}
                        type="button"
                        role="radio"
                        aria-checked={mode === item.mode}
                        disabled={disabled}
                        onClick={() => onModeChange(item.mode)}
                        className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            mode === item.mode ? "bg-emerald-500/20 text-emerald-200" : "text-white/65 hover:bg-white/[0.06]"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {mode === "team" ? (
                <p className="rounded-xl border border-dashed border-white/[0.1] px-4 py-6 text-center text-sm text-white/50">
                    A despesa é da equipe inteira. Ninguém fica devendo para quem pagou.
                </p>
            ) : (
                <>
                    <ul className="flex flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-black/35">
                        {members.map((member) => {
                            const current = state[member.uid] ?? { included: false, value: "" };
                            return (
                                <li key={member.uid} className="flex min-h-[52px] items-center gap-3 border-b border-white/[0.05] px-3 py-2 last:border-b-0">
                                    <button
                                        type="button"
                                        role="checkbox"
                                        aria-checked={current.included}
                                        aria-label={`Incluir ${member.displayName} na divisão`}
                                        disabled={disabled}
                                        onClick={() => onStateChange(member.uid, { ...current, included: !current.included })}
                                        className="group flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
                                    >
                                        {/* Ponto de seleção antes da foto; o check em cima do rosto fica para os acertos. */}
                                        <span className={`h-2 w-2 shrink-0 rounded-full transition-colors ${current.included ? "bg-emerald-400" : "bg-white/15"}`} />
                                        <BeneficiaryAvatar
                                            beneficiary={{ name: member.displayName, avatarImage: member.photoUrl, avatarColor: "#374151" }}
                                            className={`h-8 w-8 shrink-0 rounded-full border border-white/[0.12] transition-[filter] ${current.included ? "" : "brightness-[0.35] grayscale"}`}
                                        />
                                        <span className={`truncate text-sm transition-colors group-focus-visible:underline ${current.included ? "text-white" : "text-white/40"}`}>{member.displayName}</span>
                                    </button>

                                    {current.included && needsValues ? (
                                        <label className="flex w-28 shrink-0 items-center gap-1 rounded-lg border border-white/[0.1] bg-black/40 px-2 py-1.5 focus-within:border-white/[0.3]">
                                            {mode === "fixed" ? <span className="text-xs text-white/40">R$</span> : null}
                                            <input
                                                aria-label={`${mode === "percent" ? "Porcentagem" : "Valor"} de ${member.displayName}`}
                                                inputMode="decimal"
                                                disabled={disabled}
                                                value={current.value}
                                                placeholder="0"
                                                onChange={(event) => onStateChange(member.uid, { ...current, value: event.target.value })}
                                                className="w-full min-w-0 bg-transparent text-right text-sm tabular-nums text-white outline-none placeholder:text-white/30"
                                            />
                                            {mode === "percent" ? <span className="text-xs text-white/40">%</span> : null}
                                        </label>
                                    ) : null}

                                    <span className={`w-24 shrink-0 text-right text-sm tabular-nums ${current.included ? "text-white/80" : "text-white/25"}`}>
                                        {current.included ? formatReportCurrency(shareOf(member.uid)) : "Fora"}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>

                    {needsValues ? (
                        <div className="flex flex-col gap-1.5 px-1">
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                <div className={`h-full rounded-full transition-[width] ${remainder < 0 ? "bg-red-400/70" : remainder === 0 ? "bg-emerald-400/70" : "bg-amber-300/70"}`} style={{ width: `${distributed * 100}%` }} />
                            </div>
                            <span className={`text-xs ${remainder < 0 ? "text-red-200" : remainder === 0 ? "text-emerald-200" : "text-amber-200/90"}`}>
                                {remainder === 0 ? "Divisão fechada" : remainder > 0 ? `Falta distribuir ${unit(remainder)}` : `Passou ${unit(-remainder)} do total`}
                            </span>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}
