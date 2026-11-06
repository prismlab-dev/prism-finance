import { CloudAlert, CloudCheck, RefreshCw } from "lucide-react";
import { useFinanceSync } from "../../context/FinanceContext";
import { FinanceSyncRecoveryButton } from "./FinanceSyncRecoveryButton";

interface FinanceSyncStatusProps {
    compactAtLaptop?: boolean;
}

function formatSyncedAt(value: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function FinanceSyncStatus({ compactAtLaptop = false }: FinanceSyncStatusProps) {
    const sync = useFinanceSync();
    const isSynced = sync.status === "synced" && sync.pendingCount === 0;
    const isError = sync.status === "error";
    const state = isSynced ? "synced" : isError ? "error" : "syncing";
    const syncedAt = formatSyncedAt(sync.lastSyncedAt);

    const label = isSynced ? "Tudo armazenado" : isError ? "Não sincronizado" : "Sincronizando";
    const pending = sync.pendingCount > 0 ? `${sync.pendingCount} ${sync.pendingCount === 1 ? "alteração" : "alterações"} na fila` : null;
    const detail = isSynced ? (syncedAt ? `Atualizado às ${syncedAt}` : "Seus dados estão na nuvem") : (pending ?? "Enviando alterações");
    const Icon = isSynced ? CloudCheck : isError ? CloudAlert : RefreshCw;
    const iconClassName = isSynced ? "text-emerald-300" : isError ? "text-amber-300" : "text-sky-300";
    const hideAtLaptop = compactAtLaptop ? "laptop:hidden desktop:flex" : "";

    return (
        <div className={["pt-1 px-2", compactAtLaptop ? "laptop:px-0 desktop:px-2" : ""].join(" ")}>
            <div
                className={[
                    "sync-card relative overflow-hidden",
                    compactAtLaptop ? "laptop:mx-auto laptop:w-11 desktop:mx-0 desktop:w-auto" : "",
                ].join(" ")}
                data-state={state}
                title={compactAtLaptop ? `${label}: ${detail}` : undefined}
            >
                <div role="status" aria-live="polite" className="flex items-center gap-2.5 px-2.5 py-2.5">
                    <Icon
                        size={16}
                        strokeWidth={2}
                        aria-hidden
                        className={[
                            "shrink-0 transition-colors duration-500",
                            iconClassName,
                            compactAtLaptop ? "laptop:mx-auto desktop:mx-0" : "",
                            state === "syncing" ? "motion-safe:animate-spin [animation-duration:1.6s]" : "",
                        ].join(" ")}
                    />
                    <span className={["min-w-0 flex-1 flex-col leading-snug", "flex", hideAtLaptop].join(" ")}>
                        <span className="truncate text-[12.5px] font-medium text-white/85">{label}</span>
                        <span className="truncate text-[11px] tabular-nums text-white/40">{detail}</span>
                    </span>
                    {isError ? (
                        <button
                            type="button"
                            onClick={sync.retrySync}
                            aria-label="Tentar sincronizar novamente"
                            className={[
                                "shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-amber-200 ring-1 ring-amber-300/25 transition-colors hover:bg-amber-300/10 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-amber-200/70",
                                "inline-flex",
                                compactAtLaptop ? "laptop:hidden desktop:inline-flex" : "",
                            ].join(" ")}
                        >
                            <RefreshCw size={11} aria-hidden />
                            Tentar agora
                        </button>
                    ) : null}
                </div>

                {isError && sync.lastError ? (
                    <p
                        role="alert"
                        title={sync.lastError}
                        className={["line-clamp-2 px-2.5 pb-2.5 text-[11px] leading-snug text-amber-100/70", compactAtLaptop ? "laptop:hidden desktop:block" : ""].join(" ")}
                    >
                        {sync.lastError}
                    </p>
                ) : null}

                <span aria-hidden className="sync-card__beam" />
            </div>

            {isError && compactAtLaptop ? (
                <button
                    type="button"
                    onClick={sync.retrySync}
                    aria-label="Tentar sincronizar novamente"
                    title="Tentar sincronizar novamente"
                    className="mx-auto mt-1 hidden h-8 w-8 items-center justify-center rounded-lg text-amber-200 transition-colors hover:bg-amber-300/10 laptop:flex desktop:hidden"
                >
                    <RefreshCw size={13} aria-hidden />
                </button>
            ) : null}
            {isError && sync.hasPendingSync ? (
                <div className={["mt-1.5", compactAtLaptop ? "laptop:flex laptop:justify-center desktop:block" : ""].join(" ")}>
                    <FinanceSyncRecoveryButton />
                </div>
            ) : null}
        </div>
    );
}
