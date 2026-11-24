import { ChevronRight, HandCoins } from "lucide-react";
import type { ReactNode } from "react";
import type { TeamExpenseEntry, TeamMember } from "../../../context/teamTypes";
import { getCategoryIconComponent } from "../../../lib/categoryIcons";
import { BeneficiaryAvatar } from "../../common/BeneficiaryAvatar";
import { formatCurrencyBRL } from "../../transactions/transactionView";

const FALLBACK_COLOR = "#737373";
const ROW_CLASS =
    "group flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2 pr-2.5 text-left outline-none transition-colors hover:border-white/[0.12] hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-sky-400/60";

export const parseDay = (date: string) => new Date(`${date.slice(0, 10)}T00:00:00`);

/** Cartão no mesmo formato dos da home: título, valor ao lado e o conteúdo. */
export function OverviewCard({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
    return (
        <section className="rounded-2xl border border-white/[0.08] bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[15px] font-medium tracking-tight text-white">{title}</p>
                {aside}
            </div>
            {children}
        </section>
    );
}

export function OverviewEmpty({ children }: { children: ReactNode }) {
    return <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-6 text-center text-sm text-neutral-400">{children}</p>;
}

export function MemberAvatar({ member, className }: { member: TeamMember | undefined; className: string }) {
    return (
        <BeneficiaryAvatar
            beneficiary={{ name: member?.displayName ?? "Ex-membro", avatarImage: member?.photoUrl ?? null, avatarColor: "#374151" }}
            className={className}
            textClassName="text-xs font-semibold text-white"
        />
    );
}

interface PersonDebtRowProps {
    member: TeamMember | undefined;
    name: string;
    count: number;
    /** Quantas dessas transações ainda não foram pagas. */
    pendingCount: number;
    amount: number;
    onClick: () => void;
}

/** Uma pessoa com saldo em aberto; abre o detalhe das transações. */
export function PersonDebtRow({ member, name, count, pendingCount, amount, onClick }: PersonDebtRowProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >
            <MemberAvatar member={member} className="h-10 w-10 shrink-0 rounded-full border border-white/[0.1]" />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{name}</span>
                <span className="mt-1 flex flex-wrap gap-1">
                    {/* Todas pendentes: uma etiqueta só, sem repetir a contagem. */}
                    {pendingCount < count ? (
                        <span className="rounded-md bg-white/[0.06] px-1.5 py-px text-xs tabular-nums text-neutral-300">{count === 1 ? "1 transação" : `${count} transações`}</span>
                    ) : null}
                    {pendingCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-white/[0.16] px-1.5 text-xs tabular-nums text-neutral-400">
                            {pendingCount} {pendingCount === 1 ? "pendente" : "pendentes"}
                        </span>
                    ) : null}
                </span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-white">R$ {formatCurrencyBRL(amount)}</span>
            <ChevronRight size={16} className="shrink-0 text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-300" />
        </button>
    );
}

function dueLabel(offset: number) {
    if (offset < -1) return `Venceu há ${-offset} dias`;
    if (offset === -1) return "Venceu ontem";
    if (offset === 0) return "Vence hoje";
    if (offset === 1) return "Vence amanhã";
    return `Em ${offset} dias`;
}

/** Despesa não paga com o dia em destaque, como nas contas da semana da home. */
export function PendingRow({ entry, payer, offset, onClick }: { entry: TeamExpenseEntry; payer: TeamMember | undefined; offset: number; onClick: () => void }) {
    const date = parseDay(entry.date);
    const urgent = offset <= 1;
    return (
        <button type="button" onClick={onClick} className={ROW_CLASS}>
            <span
                className={`flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl border ${
                    offset < 0 ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : urgent ? "border-amber-300/30 bg-amber-300/10 text-amber-200" : "border-white/[0.08] bg-black/30 text-neutral-200"
                }`}
            >
                <span className="text-lg font-semibold leading-none tabular-nums">{date.getDate()}</span>
                <span className="mt-0.5 text-[10px] leading-none opacity-70">{date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{entry.title || "Sem descrição"}</span>
                <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[13px] text-neutral-400">
                    <MemberAvatar member={payer} className="h-4 w-4 shrink-0 rounded-full" />
                    <span className="truncate">{payer?.displayName.split(" ")[0] ?? "Ex-membro"}</span>
                    {entry.category ? (
                        <>
                            <span className="h-3 w-px shrink-0 bg-white/10" />
                            <span className="truncate">{entry.category.name}</span>
                        </>
                    ) : null}
                </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-semibold tabular-nums text-red-300">− R$ {formatCurrencyBRL(entry.amount)}</span>
                <span className={`text-xs ${offset < 0 ? "text-rose-300" : urgent ? "text-amber-300" : "text-neutral-400"}`}>{dueLabel(offset)}</span>
            </span>
        </button>
    );
}

/** Lançamento da equipe no formato do bloco de transação da home: ícone da categoria, quem e quanto. */
export function ActivityRow({ entry, payer, from, onClick }: { entry: TeamExpenseEntry; payer: TeamMember | undefined; from: TeamMember | undefined; onClick: () => void }) {
    const isSettlement = entry.kind === "settlement";
    const color = isSettlement ? "#a3a3a3" : entry.category?.color ?? FALLBACK_COLOR;
    const Icon = isSettlement ? HandCoins : getCategoryIconComponent(entry.category?.icon ?? null, entry.kind === "income" ? "income" : "expense");
    const firstName = (member: TeamMember | undefined) => member?.displayName.split(" ")[0] ?? "Ex-membro";
    const who = isSettlement ? `${firstName(from)} enviou para ${firstName(payer)}` : `${entry.kind === "income" ? "Recebido por" : "Pago por"} ${firstName(payer)}`;
    const amountClass = entry.kind === "income" ? "text-emerald-300" : isSettlement ? "text-neutral-300" : "text-red-300";
    const sign = entry.kind === "income" ? "+ " : isSettlement ? "" : "− ";

    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color, backgroundColor: `${color}1a`, border: `1px solid ${color}33` }}>
                <Icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{entry.title || "Sem descrição"}</span>
                <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[13px] text-neutral-400">
                    <MemberAvatar member={from ?? payer} className="h-4 w-4 shrink-0 rounded-full" />
                    <span className="truncate">{who}</span>
                    {entry.category ? (
                        <>
                            <span className="h-3 w-px shrink-0 bg-white/10" />
                            <span className="truncate">{entry.category.name}</span>
                        </>
                    ) : null}
                </span>
            </span>
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${amountClass}`}>
                {sign}R$ {formatCurrencyBRL(entry.amount)}
            </span>
        </button>
    );
}
