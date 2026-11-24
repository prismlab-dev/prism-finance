import type { CSSProperties, Ref } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, Clock, CreditCard, Hexagon, Wallet, type LucideIcon } from "lucide-react";
import type { Transaction } from "../../context/FinanceContext";
import { BeneficiaryAvatar } from "../common/BeneficiaryAvatar";
import { TeamAvatar } from "../team/TeamAvatar";
import { getCategoryIconComponent } from "../../lib/categoryIcons";
import { getTransactionCategoryDisplayLabel } from "../../lib/transactionCategory";
import { formatCurrencyBRL, formatTransactionDate } from "./transactionView";

export interface TransactionShowcaseTeam {
    payerName: string;
    /** Situação na equipe, não a da transação pessoal de quem pagou. */
    status: string;
    shares: { memberId: string; name: string; photoUrl: string | null; amount: number; paid: boolean; isPayer: boolean }[];
    /** Categoria do livro da equipe; a da transação pessoal de quem pagou pode ser outra. */
    category: { name: string; icon: string | null; color: string | null } | null;
}

/** Quem assina o comprovante no rodapé: a pessoa ou a equipe. */
export interface TransactionShowcaseOwner {
    kind: "user" | "team";
    name: string;
    image: string | null;
}

export interface TransactionShowcaseProps {
    transaction: Transaction;
    /** Carteira ou cartão onde a transação está. */
    sourceLabel: string;
    note?: string;
    team?: TransactionShowcaseTeam;
    owner?: TransactionShowcaseOwner;
    /** Sem o quadro com hexágonos: só o card, como aparece no modal. A imagem exportada usa o quadro. */
    bare?: boolean;
    ref?: Ref<HTMLDivElement>;
}

const FALLBACK_COLOR = "#737373";
// Quadro grafite com luzes turquesa (#3dd6c3) e uma trama de hexágonos, o símbolo do Silus.
const HEX_PATTERN = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='56' height='100'><path d='M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34' fill='none' stroke='white' stroke-opacity='0.07'/></svg>")}")`;
const FRAME_STYLE: CSSProperties = {
    backgroundColor: "#16171c",
    backgroundImage: [
        HEX_PATTERN,
        "radial-gradient(75% 55% at 92% 4%, rgba(61, 214, 195, 0.75), transparent 72%)",
        "radial-gradient(70% 55% at 4% 98%, rgba(61, 214, 195, 0.45), transparent 72%)",
        "linear-gradient(160deg, #1d1c25, #15171c)",
    ].join(", "),
    backgroundSize: "28px 50px, auto, auto, auto",
};
// Brilhos internos: o turquesa do quadro "vaza" para dentro do card e um índigo dá profundidade.
// Nenhum dos dois é cor de status, tipo ou categoria.
const TOP_GLOW: CSSProperties = {
    backgroundImage: [
        "radial-gradient(70% 60% at 100% 0%, rgba(61, 214, 195, 0.28), transparent 70%)",
        "radial-gradient(80% 70% at 0% 100%, rgba(99, 102, 241, 0.22), transparent 70%)",
        "linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 40%)",
    ].join(", "),
};
const BOTTOM_GLOW: CSSProperties = {
    backgroundImage: "radial-gradient(70% 90% at 100% 100%, rgba(61, 214, 195, 0.12), transparent 70%), radial-gradient(60% 80% at 0% 0%, rgba(99, 102, 241, 0.1), transparent 70%)",
};

// Recorta meia-lua nos dois cantos da borda do picote, deixando o quadro aparecer pelo furo.
function notchMask(edge: "top" | "bottom"): CSSProperties {
    const y = edge === "top" ? "0" : "100%";
    const hole = (x: string) => `radial-gradient(circle 12px at ${x} ${y}, transparent 11.5px, #000 12px)`;
    const mask = `${hole("0")}, ${hole("100%")}`;
    return { maskImage: mask, WebkitMaskImage: mask, maskComposite: "intersect", WebkitMaskComposite: "source-in" };
}

const TYPE_META: Record<Transaction["type"], { label: string; icon: LucideIcon; className: string }> = {
    income: { label: "Receita", icon: ArrowDownLeft, className: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200" },
    spending: { label: "Despesa", icon: ArrowUpRight, className: "border-red-400/25 bg-red-500/10 text-red-200" },
    transfer: { label: "Transferência", icon: ArrowLeftRight, className: "border-sky-400/25 bg-sky-500/10 text-sky-200" },
};

const PAID_PILL = "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
const PENDING_PILL = "border-amber-300/30 bg-amber-400/10 text-amber-200";

function getStatus(transaction: Transaction, team: TransactionShowcaseTeam | undefined): { label: string; className: string } {
    if (team) return team.status === "paid" ? { label: "Paga", className: PAID_PILL } : { label: "Pendente", className: PENDING_PILL };
    if (transaction.status === "skipped") return { label: "Ignorada", className: "border-white/15 text-white/50" };
    // Gasto no cartão segue a fatura: mesma regra da lista de transações (Previsto/Lançado).
    if (transaction.status === "pending" && transaction.paymentMethod === "credit_card") {
        return transaction.commitment === "forecast" ? { label: "Previsto", className: PENDING_PILL } : { label: "Lançado", className: PAID_PILL };
    }
    if (transaction.status === "pending") return { label: "Pendente", className: PENDING_PILL };
    const label = transaction.type === "income" ? "Recebida" : transaction.type === "transfer" ? "Concluída" : "Paga";
    return { label, className: PAID_PILL };
}

// Na receita da equipe o dinheiro entra por quem recebeu e é repassado aos outros.
function getShareLabel(share: TransactionShowcaseTeam["shares"][number], isIncome: boolean, teamPaid: boolean): string {
    // Enquanto a transação da equipe está pendente, quem vai pagar/receber ainda não o fez.
    if (share.isPayer && !teamPaid) return isIncome ? "Ainda não recebeu" : "Ainda não pagou";
    if (share.isPayer) return isIncome ? "Recebeu o valor" : "Pagou a conta";
    if (share.paid) return isIncome ? "Já recebeu" : "Já acertou";
    return isIncome ? "Falta receber" : "Falta pagar";
}

/** Comprovante visual da transação; é este nó que vira a imagem compartilhada. */
export function TransactionShowcase({ transaction, sourceLabel, note, team, owner, bare = false, ref }: TransactionShowcaseProps) {
    const { category } = transaction;
    const teamCategory = team?.category;
    const color = (teamCategory ? teamCategory.color : category.color) ?? FALLBACK_COLOR;
    const CategoryIcon = getCategoryIconComponent(teamCategory ? teamCategory.icon : category.icon, transaction.type === "income" ? "income" : "expense");
    const SourceIcon = transaction.paymentMethod === "credit_card" ? CreditCard : Wallet;
    const type = TYPE_META[transaction.type];
    const TypeIcon = type.icon;
    const status = getStatus(transaction, team);
    const categoryLabel = teamCategory ? teamCategory.name : team ? "Sem categoria" : getTransactionCategoryDisplayLabel(category);
    const trimmedNote = note?.trim();

    return (
        <div ref={ref} className={bare ? "w-full" : `${team ? "w-[400px]" : "w-[360px]"} max-w-full p-8`} style={bare ? undefined : FRAME_STYLE}>
            <div className="text-white [filter:drop-shadow(0_18px_28px_rgba(0,0,0,0.55))]">
                <div className="rounded-t-[28px] border border-b-0 border-white/[0.08] bg-raised px-6 pb-6 pt-6" style={{ ...notchMask("bottom"), ...TOP_GLOW }}>
                    <div className="flex items-start justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2.5">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color, backgroundColor: `${color}1f`, border: `1px solid ${color}40` }}>
                                <CategoryIcon size={18} />
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-xs text-white/70">{categoryLabel}</span>
                                <span className={`mt-1 inline-flex items-center gap-1 rounded-md border py-0.5 pl-1.5 pr-2 text-[10px] font-medium leading-none ${type.className}`}>
                                    <TypeIcon size={10} aria-hidden /> {team ? `${type.label} da equipe` : type.label}
                                </span>
                            </span>
                        </span>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${status.className}`}>{status.label}</span>
                    </div>

                    <p className="mt-6 line-clamp-2 text-xl font-semibold leading-tight">{transaction.description.trim() || categoryLabel}</p>
                    {trimmedNote ? <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-white/45">{trimmedNote}</p> : null}

                    <p className="spline-sans-mono mt-4 flex items-baseline gap-1.5 tabular-nums">
                        <span className="text-sm text-white/45">R$</span>
                        <span className="text-[34px] font-medium leading-none tracking-tight">{formatCurrencyBRL(transaction.value)}</span>
                    </p>
                </div>

                <div className="relative rounded-b-[28px] border border-t-0 border-white/[0.08] bg-raised" style={{ ...notchMask("top"), ...BOTTOM_GLOW }}>
                    <span className="absolute inset-x-6 top-0 border-t border-dashed border-white/15" />

                    <dl className="grid grid-cols-2 gap-x-4 px-6 pb-5 pt-5 text-sm">
                        <div className="min-w-0">
                            <dt className="text-xs text-white/40">Data</dt>
                            <dd className="mt-1 font-medium">{formatTransactionDate(transaction.date, "dd/MM/yyyy")}</dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="flex items-center gap-1.5 text-xs text-white/40">
                                {team ? (transaction.type === "income" ? "Recebido por" : "Pago por") : <><SourceIcon size={12} aria-hidden /> {transaction.paymentMethod === "credit_card" ? "Cartão" : "Carteira"}</>}
                            </dt>
                            <dd className="mt-1 truncate font-medium">{team ? team.payerName : sourceLabel}</dd>
                        </div>
                    </dl>

                    {team && team.shares.length > 0 ? (
                        <div className="px-6 pb-5">
                            <p className="text-xs text-white/40">Divisão</p>
                            <ul className="mt-2 space-y-2">
                                {team.shares.map((share) => {
                                    const settled = share.isPayer ? team.status === "paid" : share.paid;
                                    return (
                                        <li key={share.memberId} className="flex items-center gap-3 text-sm">
                                            <span className="relative shrink-0">
                                                <BeneficiaryAvatar beneficiary={{ name: share.name, avatarImage: share.photoUrl, avatarColor: "#374151" }} className="h-9 w-9 rounded-full border border-white/[0.1]" />
                                                {/* O anel na cor do card destaca o selo sobre a foto. */}
                                                <span
                                                    className={`absolute -bottom-1 -right-1 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-raised ${settled ? "bg-emerald-500 text-emerald-950" : "bg-amber-400 text-amber-950"}`}
                                                >
                                                    {settled ? <Check size={10} strokeWidth={3} aria-hidden /> : <Clock size={10} strokeWidth={3} aria-hidden />}
                                                </span>
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-medium">{share.name}</span>
                                                <span className={`block text-[11px] ${settled ? "text-emerald-300/80" : "text-amber-200/80"}`}>
                                                    {getShareLabel(share, transaction.type === "income", team.status === "paid")}
                                                </span>
                                            </span>
                                            <span className="spline-sans-mono shrink-0 tabular-nums text-white/80">{formatCurrencyBRL(share.amount)}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ) : null}

                    <div className="flex items-center gap-2 border-t border-white/[0.06] px-6 py-3 text-[11px] font-medium text-white/40">
                        <span className="flex shrink-0 items-center gap-1.5 uppercase tracking-wide">
                            <Hexagon size={12} aria-hidden /> Silus
                        </span>
                        {owner ? (
                            <>
                                {/* SVG em vez de span: com 3px o navegador arredonda a caixa e o ponto vira oval. */}
                                <svg width="4" height="4" viewBox="0 0 4 4" className="shrink-0 text-white/25" aria-hidden>
                                    <circle cx="2" cy="2" r="1.5" fill="currentColor" />
                                </svg>
                                <span className="flex min-w-0 items-center gap-1.5 text-white/60">
                                    {owner.kind === "team" ? (
                                        <TeamAvatar name={owner.name} image={owner.image} className="size-4 rounded-[4px]" iconSize={10} />
                                    ) : (
                                        <BeneficiaryAvatar beneficiary={{ name: owner.name, avatarImage: owner.image, avatarColor: "#374151" }} className="h-4 w-4 rounded-full" textClassName="text-[8px] font-semibold text-white" />
                                    )}
                                    <span className="truncate">{owner.name}</span>
                                </span>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
