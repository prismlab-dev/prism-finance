import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileUp, History, ShieldAlert, TextCursorInput } from "lucide-react";
import { useFinance } from "../../../context/FinanceContext";
import type { FinanceSnapshot } from "../../../context/FinanceContext";
import { buildFinanceBackupFile, downloadFinanceBackupFile, listLocalFinanceBackups, parseFinanceBackupFile, type FinanceBackupFile, type LocalFinanceBackupRecord } from "../../../lib/financeBackup";
import { CreditCardInvoiceCsvImportCard } from "./CreditCardInvoiceCsvImportCard";
import { CsvTransactionImportCard } from "./CsvTransactionImportCard";
import { IconTextField } from "../../transactions/IconTextField";
import { SETTINGS_DANGER_BUTTON_CLASS, SETTINGS_PRIMARY_BUTTON_CLASS, SETTINGS_SECONDARY_BUTTON_CLASS, SettingsFeedback, SettingsSection } from "./SettingsSection";

const IMPORT_CONFIRMATION_TEXT = "IMPORTAR";

function formatDateTime(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return "Data indisponível";
    }

    return parsed.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function SnapshotStats({ finance }: { finance: FinanceSnapshot }) {
    const items = useMemo(
        () => [
            { label: "Carteiras", value: finance.wallets.length },
            { label: "Cartões", value: finance.creditCards.length },
            { label: "Faturas", value: finance.creditCardInvoices.length },
            { label: "Transações", value: finance.transactions.length },
            { label: "Beneficiários", value: finance.beneficiaries.length },
            { label: "Categorias", value: finance.categories.length },
            { label: "Tags", value: finance.tags.length },
            { label: "Desejos", value: finance.wishItems.length },
        ],
        [finance],
    );

    return (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {items.map((item) => (
                <div key={item.label} className="min-w-0">
                    <dt className="truncate text-xs text-white/40">{item.label}</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums text-white">{item.value}</dd>
                </div>
            ))}
        </dl>
    );
}

export function DataSettingsTab() {
    const { user, profile, finance, favoriteWalletId, loading, updateFinance, setFavoriteWallet } = useFinance();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [pendingImport, setPendingImport] = useState<FinanceBackupFile | LocalFinanceBackupRecord | null>(null);
    const [importConfirmation, setImportConfirmation] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
    const [localBackups, setLocalBackups] = useState<LocalFinanceBackupRecord[]>([]);

    const refreshLocalBackups = async () => {
        if (!user) {
            setLocalBackups([]);
            return;
        }

        setLocalBackups(await listLocalFinanceBackups(user.uid));
    };

    useEffect(() => {
        if (!user) {
            setLocalBackups([]);
            return;
        }

        let cancelled = false;
        void listLocalFinanceBackups(user.uid).then((backups) => {
            if (!cancelled) {
                setLocalBackups(backups);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [user]);

    const handleExportCurrent = () => {
        if (!user || !finance) {
            setFeedback({
                type: "error",
                message: "Os dados ainda estão carregando. Tente de novo em instantes.",
            });
            return;
        }

        const backup = buildFinanceBackupFile({
            uid: user.uid,
            email: user.email ?? null,
            displayName: profile?.displayName ?? user.displayName ?? null,
            favoriteWalletId,
            finance,
        });

        downloadFinanceBackupFile(backup, "prism-backup");
        setFeedback({
            type: "success",
            message: "Backup baixado.",
        });
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const text = await file.text();
            const parsed = parseFinanceBackupFile(JSON.parse(text));
            setPendingImport(parsed);
            setImportConfirmation("");
            setFeedback({
                type: "success",
                message: "Backup carregado. Confira os números antes de restaurar.",
            });
        } catch (error) {
            setPendingImport(null);
            setFeedback({
                type: "error",
                message: error instanceof Error ? error.message : "Não foi possível ler esse arquivo de backup.",
            });
        } finally {
            event.target.value = "";
        }
    };

    const queueLocalBackupForImport = (backup: LocalFinanceBackupRecord) => {
        setPendingImport(backup);
        setImportConfirmation("");
        setFeedback({
            type: "success",
            message: "Cópia selecionada. Confira os números em Restaurar backup.",
        });
    };

    const handleConfirmImport = async () => {
        if (!user || !finance || !pendingImport || isImporting) {
            return;
        }

        if (importConfirmation.trim().toUpperCase() !== IMPORT_CONFIRMATION_TEXT) {
            setFeedback({
                type: "error",
                message: `Digite ${IMPORT_CONFIRMATION_TEXT} para confirmar.`,
            });
            return;
        }

        setIsImporting(true);
        setFeedback(null);

        try {
            const rollbackBackup = buildFinanceBackupFile({
                uid: user.uid,
                email: user.email ?? null,
                displayName: profile?.displayName ?? user.displayName ?? null,
                favoriteWalletId,
                finance,
            });
            downloadFinanceBackupFile(rollbackBackup, "prism-backup-pre-import");

            await updateFinance(pendingImport.finance);
            if (pendingImport.preferences.favoriteWalletId) {
                await setFavoriteWallet(pendingImport.preferences.favoriteWalletId);
            }

            setPendingImport(null);
            setImportConfirmation("");
            await refreshLocalBackups();
            setFeedback({
                type: "success",
                message: "Backup restaurado. Uma cópia do estado anterior foi baixada.",
            });
        } catch (error) {
            console.error("Failed to import finance backup:", error);
            setFeedback({
                type: "error",
                message: error instanceof Error ? error.message : "Não foi possível restaurar esse backup agora.",
            });
        } finally {
            setIsImporting(false);
        }
    };

    const cancelPendingImport = () => {
        setPendingImport(null);
        setImportConfirmation("");
    };

    return (
        <div className="space-y-6">
            <header className="rounded-3xl border border-white/[0.08] bg-surface p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">Seus dados</h2>
                        <p className="mt-1 max-w-xl text-sm text-white/50">Tudo o que está guardado na sua conta hoje. Baixe um backup antes de importar ou restaurar.</p>
                    </div>
                    <button type="button" onClick={handleExportCurrent} disabled={!finance || loading} className={SETTINGS_PRIMARY_BUTTON_CLASS}>
                        <Download size={16} aria-hidden />
                        Baixar backup
                    </button>
                </div>
                {finance ? (
                    <div className="mt-6">
                        <SnapshotStats finance={finance} />
                    </div>
                ) : null}
            </header>

            <div className="px-1 sm:px-2">
                <SettingsFeedback feedback={feedback} />

                <CsvTransactionImportCard />

                <CreditCardInvoiceCsvImportCard />

                <SettingsSection
                    title="Restaurar backup"
                    description="Substitui todos os dados atuais pelos do arquivo. Antes, o app baixa uma cópia do estado atual para você poder voltar."
                >
                    <div className="space-y-4">
                        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileChange} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className={SETTINGS_SECONDARY_BUTTON_CLASS}>
                            <FileUp size={16} aria-hidden />
                            Escolher arquivo de backup
                        </button>

                        {pendingImport ? (
                            <div className="max-w-2xl space-y-4 rounded-2xl border border-red-400/20 bg-red-500/[0.06] p-4">
                                <div className="flex items-start gap-3">
                                    <ShieldAlert size={18} aria-hidden className="mt-0.5 shrink-0 text-red-200" />
                                    <p className="text-sm text-red-50/85">
                                        Backup de {formatDateTime(pendingImport.exportedAt)}, feito por {pendingImport.source.displayName || pendingImport.source.email || "usuário desconhecido"}. Ao restaurar, ele substitui tudo abaixo.
                                    </p>
                                </div>
                                <SnapshotStats finance={pendingImport.finance} />
                                <div className="max-w-md">
                                    <IconTextField
                                        ariaLabel={`Digite ${IMPORT_CONFIRMATION_TEXT} para confirmar`}
                                        icon={TextCursorInput}
                                        value={importConfirmation}
                                        onChange={setImportConfirmation}
                                        placeholder={`Digite ${IMPORT_CONFIRMATION_TEXT} para confirmar`}
                                        disabled={isImporting}
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => void handleConfirmImport()} disabled={isImporting || loading} className={SETTINGS_DANGER_BUTTON_CLASS}>
                                        <FileUp size={16} aria-hidden />
                                        {isImporting ? "Restaurando..." : "Restaurar backup"}
                                    </button>
                                    <button type="button" onClick={cancelPendingImport} disabled={isImporting} className={SETTINGS_SECONDARY_BUTTON_CLASS}>
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </SettingsSection>

                <SettingsSection title="Cópias neste navegador" description="O app guarda cópias recentes automaticamente neste navegador. Servem para voltar atrás rápido.">
                    {localBackups.length < 1 ? (
                        <p className="text-sm text-white/45">Nenhuma cópia guardada neste navegador ainda.</p>
                    ) : (
                        <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-surface">
                            {localBackups.map((backup) => (
                                <li key={backup.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                                    <History size={17} aria-hidden className="shrink-0 text-white/45" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-white">{formatDateTime(backup.storedAt)}</p>
                                        <p className="mt-0.5 text-xs text-white/40">
                                            {backup.finance.transactions.length} transações, {backup.finance.wallets.length} carteiras
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => queueLocalBackupForImport(backup)} className={SETTINGS_SECONDARY_BUTTON_CLASS}>
                                            Restaurar
                                        </button>
                                        <button type="button" onClick={() => downloadFinanceBackupFile(backup, "prism-backup-local")} className={SETTINGS_SECONDARY_BUTTON_CLASS}>
                                            <Download size={15} aria-hidden />
                                            <span className="sr-only sm:not-sr-only">Baixar</span>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </SettingsSection>
            </div>
        </div>
    );
}
