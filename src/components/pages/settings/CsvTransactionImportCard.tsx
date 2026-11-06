import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, FileUp, TextCursorInput } from "lucide-react";
import { SETTINGS_PRIMARY_BUTTON_CLASS, SETTINGS_SECONDARY_BUTTON_CLASS, SettingsFeedback, SettingsSection } from "./SettingsSection";
import { IconTextField } from "../../transactions/IconTextField";
import { SingleSelectCombobox } from "../../transactions/SingleSelectCombobox";
import { useFinance } from "../../../context/FinanceContext";
import {
    buildBankStatementTransactionDrafts,
    parseBankStatementCsv,
    type BankStatementCsvImportResult,
} from "../../../lib/bankStatementCsvImport";
import { buildFinanceBackupFile, downloadFinanceBackupFile } from "../../../lib/financeBackup";

const CSV_IMPORT_CONFIRMATION_TEXT = "IMPORTAR CSV";

function formatCurrency(value: number): string {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

function getDefaultWalletId(walletIds: Set<string>, favoriteWalletId: string): string {
    if (favoriteWalletId && walletIds.has(favoriteWalletId)) {
        return favoriteWalletId;
    }

    return walletIds.values().next().value ?? "";
}

function ImportPreviewStats({ preview }: { preview: BankStatementCsvImportResult }) {
    const items = [
        { label: "Transacoes", value: preview.transactions.length.toString() },
        { label: "Entradas", value: `${preview.summary.incomeCount} / ${formatCurrency(preview.summary.incomeTotal)}` },
        { label: "Saidas", value: `${preview.summary.spendingCount} / ${formatCurrency(preview.summary.spendingTotal)}` },
        { label: "Ignoradas", value: preview.skippedRows.length.toString() },
    ];

    return (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {items.map((item) => (
                <div key={item.label} className="min-w-0">
                    <dt className="truncate text-xs text-white/40">{item.label}</dt>
                    <dd className="mt-0.5 text-sm font-semibold tabular-nums text-white">{item.value}</dd>
                </div>
            ))}
        </dl>
    );
}

export function CsvTransactionImportCard() {
    const { user, profile, finance, favoriteWalletId, wallets, loading, addTransaction } = useFinance();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const availableWallets = useMemo(() => wallets.filter((wallet) => wallet.isActive), [wallets]);
    const walletOptions = useMemo(() => availableWallets.map((wallet) => ({ id: wallet.id, label: wallet.name, searchText: wallet.name })), [availableWallets]);
    const availableWalletIds = useMemo(() => new Set(availableWallets.map((wallet) => wallet.id)), [availableWallets]);
    const [selectedWalletId, setSelectedWalletId] = useState(() => getDefaultWalletId(availableWalletIds, favoriteWalletId));
    const [preview, setPreview] = useState<BankStatementCsvImportResult | null>(null);
    const [confirmation, setConfirmation] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
    const canImport =
        Boolean(user && finance && preview && preview.transactions.length > 0 && selectedWalletId) &&
        confirmation.trim().toUpperCase() === CSV_IMPORT_CONFIRMATION_TEXT &&
        !loading &&
        !isImporting;

    useEffect(() => {
        if (selectedWalletId && availableWalletIds.has(selectedWalletId)) {
            return;
        }

        setSelectedWalletId(getDefaultWalletId(availableWalletIds, favoriteWalletId));
    }, [availableWalletIds, favoriteWalletId, selectedWalletId]);

    const resetPreview = () => {
        setPreview(null);
        setConfirmation("");
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const text = await file.text();
            const parsed = parseBankStatementCsv(text);
            const nextWalletId =
                selectedWalletId && availableWalletIds.has(selectedWalletId)
                    ? selectedWalletId
                    : getDefaultWalletId(availableWalletIds, favoriteWalletId);
            setSelectedWalletId(nextWalletId);
            setPreview(parsed);
            setConfirmation("");
            setFeedback({
                type: parsed.transactions.length > 0 ? "success" : "error",
                message:
                    parsed.transactions.length > 0
                        ? "CSV carregado. Revise o resumo antes de importar."
                        : "Nenhuma transacao valida foi encontrada nesse CSV.",
            });
        } catch (error) {
            resetPreview();
            setFeedback({
                type: "error",
                message: error instanceof Error ? error.message : "Nao foi possivel ler esse CSV.",
            });
        } finally {
            event.target.value = "";
        }
    };

    const handleConfirmImport = async () => {
        if (!user || !finance || !preview || !selectedWalletId || isImporting) {
            return;
        }

        if (confirmation.trim().toUpperCase() !== CSV_IMPORT_CONFIRMATION_TEXT) {
            setFeedback({
                type: "error",
                message: `Digite ${CSV_IMPORT_CONFIRMATION_TEXT} para confirmar a importacao.`,
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
            downloadFinanceBackupFile(rollbackBackup, "prism-backup-pre-import-csv");

            const drafts = buildBankStatementTransactionDrafts(preview.transactions, selectedWalletId);
            for (const draft of drafts) {
                await addTransaction(draft);
            }

            setFeedback({
                type: "success",
                message: `${drafts.length} transacoes importadas com sucesso. O estado anterior tambem foi exportado antes da importacao.`,
            });
            resetPreview();
        } catch (error) {
            console.error("Failed to import bank statement CSV:", error);
            setFeedback({
                type: "error",
                message: error instanceof Error ? error.message : "Nao foi possivel importar esse CSV agora.",
            });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <SettingsSection title="Importar extrato" description="Adiciona transações de um extrato CSV com data, título, descrição, entrada e saída. Nada do que já existe é apagado.">
            <div className="space-y-4">
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!finance || loading || availableWallets.length < 1}
                    className={SETTINGS_SECONDARY_BUTTON_CLASS}
                >
                    <FileSpreadsheet size={16} aria-hidden />
                    Escolher arquivo CSV
                </button>
                {availableWallets.length < 1 ? <p className="text-sm text-white/45">Crie uma carteira antes de importar um extrato.</p> : null}

                <SettingsFeedback feedback={feedback} />

                {preview ? (
                    <div className="max-w-2xl space-y-4 rounded-2xl border border-white/[0.08] bg-surface p-4">
                        <p className="text-sm text-white/70">Confira o resumo, escolha a carteira e confirme. As transações entram como pagas.</p>
                        <ImportPreviewStats preview={preview} />

                        {preview.skippedRows.length > 0 ? (
                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/60">
                                <p className="font-medium text-white/80">Linhas que não serão importadas</p>
                                <ul className="mt-2 space-y-1">
                                    {preview.skippedRows.slice(0, 5).map((message) => (
                                        <li key={message}>{message}</li>
                                    ))}
                                </ul>
                                {preview.skippedRows.length > 5 ? <p className="mt-2">E mais {preview.skippedRows.length - 5}.</p> : null}
                            </div>
                        ) : null}

                        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
                            <SingleSelectCombobox
                                hideLabel
                                label="Carteira de destino"
                                value={selectedWalletId}
                                placeholder="Carteira de destino"
                                emptyMessage="Nenhuma carteira ativa."
                                options={walletOptions}
                                onChange={setSelectedWalletId}
                                renderOptionContent={(option) => <span className="truncate text-sm text-white">{option.label}</span>}
                            />
                            <IconTextField
                                ariaLabel={`Digite ${CSV_IMPORT_CONFIRMATION_TEXT} para confirmar`}
                                icon={TextCursorInput}
                                value={confirmation}
                                onChange={setConfirmation}
                                placeholder={`Digite ${CSV_IMPORT_CONFIRMATION_TEXT}`}
                                disabled={isImporting}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={handleConfirmImport} disabled={!canImport} className={SETTINGS_PRIMARY_BUTTON_CLASS}>
                                <FileUp size={16} aria-hidden />
                                {isImporting ? "Importando..." : "Importar transações"}
                            </button>
                            <button type="button" onClick={resetPreview} disabled={isImporting} className={SETTINGS_SECONDARY_BUTTON_CLASS}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </SettingsSection>
    );
}
