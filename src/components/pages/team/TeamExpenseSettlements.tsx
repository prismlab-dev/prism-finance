import { ArrowDownLeft, Check, Undo2 } from "lucide-react";
import type { TeamShareStatus } from "../../../context/team/teamShareStatus";
import type { TeamMember } from "../../../context/teamTypes";
import { BeneficiaryAvatar } from "../../common/BeneficiaryAvatar";
import { HoverTooltip } from "../../common/HoverTooltip";
import { formatReportCurrency } from "../planning/planningReportFormatting";

interface TeamExpenseSettlementsProps {
    shares: TeamShareStatus[];
    members: TeamMember[];
    /** Confirma que recebi a parte deste membro; fica guardado na própria despesa. */
    onConfirm?: (memberId: string) => void;
    /** Desfaz a confirmação; só para partes confirmadas na despesa (acertos antigos não). */
    onRevert?: (memberId: string) => void;
    canRevert?: (memberId: string) => boolean;
    /** Valor confirmado agora e ainda não salvo; ao salvar vira uma receita para revisar. */
    newlyReceived?: number;
    /** Receita: as partes são repasses meus para os membros, não reembolsos deles para mim. */
    kind?: "expense" | "income";
}

const COPY = {
    expense: { done: ["pagou", "pagaram"], missing: "Falta receber", allDone: "Tudo recebido", confirm: "Confirmar que recebi", undo: "Desfazer recebimento", next: "uma receita", where: "na sua carteira" },
    income: { done: ["recebeu", "receberam"], missing: "Falta repassar", allDone: "Tudo repassado", confirm: "Confirmar que repassei", undo: "Desfazer repasse", next: "uma despesa", where: "da sua carteira" },
} as const;

// Listras para o trecho ainda não recebido da barra.
const PENDING_STRIPES = "repeating-linear-gradient(135deg, rgb(252 211 77 / 0.45) 0 4px, rgb(252 211 77 / 0.18) 4px 8px)";

/** Quanto desta despesa já voltou para quem pagou: barra por pessoa e um cartão por membro. */
export function TeamExpenseSettlements({ shares, members, onConfirm, onRevert, canRevert, newlyReceived = 0, kind = "expense" }: TeamExpenseSettlementsProps) {
    const copy = COPY[kind];
    const memberOf = (memberId: string) => members.find((member) => member.uid === memberId);
    const missing = shares.filter((share) => !share.paid).reduce((sum, share) => sum + share.amount, 0);
    const paidCount = shares.filter((share) => share.paid).length;

    return (
        <section className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <div className="flex items-end justify-between gap-3">
                <p className="text-sm tabular-nums text-white/60">
                    {paidCount} de {shares.length} {paidCount === 1 ? copy.done[0] : copy.done[1]}
                </p>
                {missing > 0 ? (
                    <p className="text-right">
                        <span className="block text-[11px] text-white/40">{copy.missing}</span>
                        <span className="text-base font-semibold tabular-nums text-amber-200">{formatReportCurrency(missing)}</span>
                    </p>
                ) : (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-300">
                        <Check size={14} strokeWidth={3} /> {copy.allDone}
                    </span>
                )}
            </div>

            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={missing > 0 ? `${copy.missing} ${formatReportCurrency(missing)}` : copy.allDone}>
                {shares.map((share) => (
                    <span
                        key={share.memberId}
                        className={`h-full first:rounded-l-full last:rounded-r-full ${share.paid ? "bg-emerald-400/75" : ""}`}
                        style={{ flexGrow: share.amount, flexBasis: 0, backgroundImage: share.paid ? undefined : PENDING_STRIPES }}
                    />
                ))}
            </div>

            <ul className="grid gap-2 sm:grid-cols-2">
                {shares.map((share) => {
                    const member = memberOf(share.memberId);
                    const name = member?.displayName ?? "Ex-membro";
                    return (
                        <li key={share.memberId} className="flex items-center gap-2.5 rounded-lg bg-black/30 px-2.5 py-2">
                            <span className="relative shrink-0">
                                <BeneficiaryAvatar
                                    beneficiary={{ name, avatarImage: member?.photoUrl ?? null, avatarColor: "#374151" }}
                                    className={`h-8 w-8 rounded-full border border-white/[0.12] ${share.paid ? "" : "brightness-50"}`}
                                />
                                {share.paid ? (
                                    <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-black ring-2 ring-[#141414]">
                                        <Check size={10} strokeWidth={3.5} />
                                    </span>
                                ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-white">{name.split(" ")[0]}</span>
                                <span className={`block text-xs tabular-nums ${share.paid ? "text-white/40 line-through decoration-white/25" : "text-amber-200/90"}`}>{formatReportCurrency(share.amount)}</span>
                            </span>
                            {share.paid && onRevert && canRevert?.(share.memberId) ? (
                                <HoverTooltip focusable={false} content={copy.undo} className="inline-flex shrink-0 rounded-full">
                                    <button
                                        type="button"
                                        onClick={() => onRevert(share.memberId)}
                                        aria-label={`${copy.undo}: ${name}`}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
                                    >
                                        <Undo2 size={15} />
                                    </button>
                                </HoverTooltip>
                            ) : null}
                            {!share.paid && onConfirm ? (
                                <HoverTooltip focusable={false} content={copy.confirm} className="inline-flex shrink-0 rounded-full">
                                    <button
                                        type="button"
                                        onClick={() => onConfirm(share.memberId)}
                                        aria-label={`${copy.confirm}: ${formatReportCurrency(share.amount)}, ${name}`}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/30 text-emerald-200 transition-colors hover:border-emerald-300/60 hover:bg-emerald-500/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-300/60"
                                    >
                                        <Check size={15} strokeWidth={2.75} />
                                    </button>
                                </HoverTooltip>
                            ) : null}
                        </li>
                    );
                })}
            </ul>

            {newlyReceived > 0 ? (
                <p className="flex items-center gap-2 rounded-lg bg-emerald-500/[0.08] px-3 py-2 text-xs text-emerald-100/85">
                    <ArrowDownLeft size={14} className="shrink-0 text-emerald-300" />
                    Ao salvar, abre {copy.next} de {formatReportCurrency(newlyReceived)} para você lançar {copy.where}.
                </p>
            ) : null}
        </section>
    );
}
