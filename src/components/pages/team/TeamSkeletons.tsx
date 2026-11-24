import type { ReactNode } from "react";
import { SkeletonBlock, SkeletonLine } from "../../loading/SkeletonPrimitives";

const rows = (count: number) => Array.from({ length: count }, (_, index) => index);

/** Cartão no formato do OverviewCard: título à esquerda, detalhe à direita. */
function CardSkeleton({ titleWidth, children }: { titleWidth: string; children: ReactNode }) {
    return (
        <section className="rounded-2xl border border-white/[0.08] bg-surface p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
                <SkeletonLine className={`h-3.5 ${titleWidth}`} />
                <SkeletonBlock className="h-6 w-16 rounded-full" />
            </div>
            {children}
        </section>
    );
}

/** Mesma grade da TeamOverviewActivity: pendências e despesas em aberto à esquerda, linha do tempo à direita. */
export function TeamActivitySkeleton() {
    return (
        <div aria-hidden className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
            <div className="flex min-w-0 flex-col gap-3">
                <section className="rounded-2xl border border-white/[0.08] bg-surface p-4">
                    <div className="flex items-center gap-2">
                        <SkeletonBlock className="h-6 w-6" />
                        <SkeletonLine className="h-3.5 w-40" />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <SkeletonBlock className="h-7 w-36" />
                        <div className="flex -space-x-2">
                            {rows(3).map((index) => <SkeletonBlock key={index} className="h-7 w-7 rounded-full border-2 border-surface" />)}
                        </div>
                    </div>
                    <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-3">
                        {rows(2).map((index) => (
                            <div key={index} className="flex items-center gap-3">
                                <SkeletonBlock className="h-8 w-8 rounded-full" />
                                <div className="flex-1 space-y-1.5">
                                    <SkeletonLine className="w-32" />
                                    <SkeletonLine className="h-2.5 w-20" />
                                </div>
                                <SkeletonLine className="w-16" />
                            </div>
                        ))}
                    </div>
                </section>

                <CardSkeleton titleWidth="w-36">
                    <div className="space-y-1.5">
                        {rows(3).map((index) => (
                            <div key={index} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2">
                                <SkeletonBlock className="h-9 w-9 rounded-xl" />
                                <div className="flex-1 space-y-1.5">
                                    <SkeletonLine className="w-2/5" />
                                    <SkeletonLine className="h-2.5 w-1/4" />
                                </div>
                                <SkeletonLine className="w-16" />
                            </div>
                        ))}
                    </div>
                </CardSkeleton>
            </div>

            <CardSkeleton titleWidth="w-44">
                <ol className="space-y-5">
                    {rows(3).map((index) => (
                        <li key={index} className="relative pl-6">
                            {index < 2 ? <span className="absolute -bottom-5 left-[5px] top-4 w-px bg-white/[0.08]" /> : null}
                            <span className="absolute left-0 top-[3px] h-[11px] w-[11px] rounded-full border-2 border-surface bg-white/[0.12]" />
                            <SkeletonLine className="ml-2 w-20" />
                            <div className="mt-3 space-y-3">
                                {rows(index === 0 ? 2 : 1).map((row) => (
                                    <div key={row} className="flex items-center gap-3">
                                        <SkeletonBlock className="h-8 w-8 rounded-xl" />
                                        <div className="flex-1 space-y-1.5">
                                            <SkeletonLine className="w-1/2" />
                                            <SkeletonLine className="h-2.5 w-1/3" />
                                        </div>
                                        <SkeletonLine className="w-14" />
                                    </div>
                                ))}
                            </div>
                        </li>
                    ))}
                </ol>
            </CardSkeleton>
        </div>
    );
}

/** Visão geral enquanto a equipe ainda não chegou: cabeçalho com foto, nome, membros e atalhos. */
export function TeamOverviewSkeleton() {
    return (
        <section role="status" aria-label="Carregando equipe" className="space-y-4 pb-10">
            <header aria-hidden className="flex flex-col gap-4 px-1 py-3 md:flex-row md:items-center md:px-2">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                    <SkeletonBlock className="size-20 shrink-0 rounded-3xl" />
                    <div className="space-y-2.5">
                        <SkeletonBlock className="h-6 w-48" />
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-1.5">
                                {rows(3).map((index) => <SkeletonBlock key={index} className="h-5 w-5 rounded-full border-2 border-surface" />)}
                            </div>
                            <SkeletonLine className="w-16" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-1.5">
                    {rows(3).map((index) => <SkeletonBlock key={index} className="h-9 w-28 rounded-xl" />)}
                </div>
            </header>
            <TeamActivitySkeleton />
        </section>
    );
}

/** Tabela de lançamentos da equipe: cabeçalho, título do mês e linhas. */
export function TeamExpensesTableSkeleton() {
    return (
        <section role="status" aria-label="Carregando transações da equipe" className="min-w-0 flex-1 rounded-2xl finance-surface">
            <div aria-hidden className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4">
                <div className="flex items-center gap-3">
                    <SkeletonLine className="h-4 w-44" />
                    <SkeletonLine className="w-28" />
                </div>
                <SkeletonBlock className="h-8 w-24 rounded-lg" />
            </div>
            <div aria-hidden className="px-2 pb-2">
                <div className="flex gap-4 border-b border-white/[0.08] px-3 py-3">
                    {["w-12", "w-16", "w-24", "w-20"].map((width) => <SkeletonLine key={width} className={`h-2.5 ${width}`} />)}
                    <SkeletonLine className="ml-auto h-2.5 w-14" />
                </div>
                {rows(7).map((index) => (
                    <div key={index} className="flex items-center gap-4 border-b border-white/[0.04] px-3 py-3">
                        <SkeletonBlock className="h-5 w-16 rounded-md" />
                        <SkeletonLine className="hidden w-16 sm:block" />
                        <SkeletonLine className={index % 3 === 0 ? "w-40" : index % 3 === 1 ? "w-28" : "w-36"} />
                        <div className="hidden items-center gap-2 md:flex">
                            <SkeletonBlock className="h-7 w-7" />
                            <SkeletonLine className="w-20" />
                        </div>
                        <SkeletonLine className="ml-auto w-20" />
                    </div>
                ))}
            </div>
        </section>
    );
}

/** Página de membros: título e tabela de pessoas. */
export function TeamMembersSkeleton() {
    return (
        <section role="status" aria-label="Carregando membros" className="space-y-4 pb-10">
            <div aria-hidden className="space-y-2.5">
                <SkeletonBlock className="h-7 w-36" />
                <SkeletonLine className="w-64 max-w-full" />
            </div>
            <div aria-hidden className="rounded-2xl finance-surface">
                <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
                    <SkeletonLine className="h-4 w-32" />
                    <SkeletonLine className="w-28" />
                </div>
                <div className="px-2 pb-2">
                    {rows(4).map((index) => (
                        <div key={index} className="flex items-center gap-3 border-b border-white/[0.04] px-3 py-3">
                            <SkeletonBlock className="h-8 w-8 shrink-0 rounded-full" />
                            <div className="flex-1 space-y-1.5">
                                <SkeletonLine className="w-36 max-w-full" />
                                <SkeletonLine className="h-2.5 w-48 max-w-full" />
                            </div>
                            <SkeletonBlock className="h-8 w-28 rounded-lg" />
                            <SkeletonLine className="hidden w-20 md:block" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/** Aba Equipe das configurações: blocos de formulário e lista. */
export function TeamSettingsSkeleton() {
    return (
        <div role="status" aria-label="Carregando equipe" className="space-y-6">
            <div aria-hidden className="space-y-3">
                <SkeletonLine className="h-4 w-40" />
                <div className="flex items-center gap-3">
                    <SkeletonBlock className="size-16 shrink-0 rounded-2xl" />
                    <SkeletonBlock className="h-11 flex-1 rounded-xl" />
                </div>
                <SkeletonBlock className="h-10 w-36 rounded-full" />
            </div>
            <div aria-hidden className="space-y-3">
                <SkeletonLine className="h-4 w-32" />
                {rows(3).map((index) => <SkeletonBlock key={index} className="h-14 rounded-xl" />)}
            </div>
        </div>
    );
}
