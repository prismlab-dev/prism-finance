import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, FileUp, TextCursorInput } from "lucide-react";
import { SETTINGS_PRIMARY_BUTTON_CLASS, SETTINGS_SECONDARY_BUTTON_CLASS, SettingsFeedback, SettingsSection } from "./SettingsSection";
import { IconTextField } from "../../transactions/IconTextField";
import { SingleSelectCombobox } from "../../transactions/SingleSelectCombobox";
import { useFinance } from "../../../context/FinanceContext";
import {
    buildCreditCardInvoiceImportSnapshot,
    parseCreditCardInvoiceCsv,
    type CreditCardInvoiceCsvImportResult,
} from "../../../lib/creditCardInvoiceCsvImport";
import { buildFinanceBackupFile, downloadFinanceBackupFile } from "../../../lib/financeBackup";

const INVOICE_CSV_IMPORT_CONFIRMATION_TEXT = "IMPORTAR FATURA";

function formatCurrency(value: number): string {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

function formatDate(value: string): string {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) {
        return value;
    }
    return `${day}/${month}/${year}`;
}

function getDefaultCreditCardId(cardIds: Set<string>, favoriteCreditCardId: string | null): string {
    if (favoriteCreditCardId && cardIds.has(favoriteCreditCardId)) {
        return favoriteCreditCardId;
    }

    return cardIds.values().next().value ?? "";
}

function ImportPreviewStats({ preview }: { preview: CreditCardInvoiceCsvImportResult }) {
    const items = [
        { label: "Compras unicas", value: preview.summary.singleCount.toString() },
        { label: "Series parceladas", value: preview.summary.installmentSeriesCount.toString() },
        { label: "Encargos", value: preview.summary.feeCount.toString() },
        { label: "Parcelas ignoradas", value: preview.summary.ignoredInstallmentsCount.toString() },
        { label: "Total importado", value: formatCurrency(preview.summary.totalAmount) },
        { label: "Linhas ignoradas", value: (preview.ignoredRows.length + preview.skippedRows.length).toString() },
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

function InvoiceTotalsPreview({ preview }: { preview: CreditCardInvoiceCsvImportResult }) {
    return (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <p className="text-xs text-white/40">Totais por fatura</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {preview.summary.totalsByInvoice.map((invoice) => (
                    <div key={invoice.cycleKey} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                        <p className="text-sm font-medium text-white">{formatDate(invoice.invoiceDate)}</p>
                        <p className="mt-1 text-xs text-white/50">
                            {invoice.count} lancamentos - {formatCurrency(invoice.amount)}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function CreditCardInvoiceCsvImportCard() {
    const { user, profile, finance, favoriteWalletId, favoriteCreditCardId, creditCards, loading, updateFinance } = useFinance();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const activeCreditCards = useMemo(() => creditCards.filter((card) => card.isActive), [creditCards]);
    const creditCardOptions = useMemo(() => activeCreditCards.map((card) => ({ id: card.id, label: card.name, searchText: card.name })), [activeCreditCards]);
    const activeCreditCardIds = useMemo(() => new Set(activeCreditCards.map((card) => card.id)), [activeCreditCards]);
    const [selectedCreditCardId, setSelectedCreditCardId] = useState(() => getDefaultCreditCardId(activeCreditCardIds, favoriteCreditCardId));
    const [preview, setPreview] = useState<CreditCardInvoiceCsvImportResult | null>(null);
    const [confirmation, setConfirmation] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);

    const selectedCreditCard = useMemo(
        () => activeCreditCards.find((card) => card.id === selectedCreditCardId) ?? null,
        [activeCreditCards, selectedCreditCardId],
    );
    const canImport =
        Boolean(user && finance && preview && preview.rows.length > 0 && selectedCreditCard) &&
        confirmation.trim().toUpperCase() === INVOICE_CSV_IMPORT_CONFIRMATION_TEXT &&
        !loading &&
        !isImporting;

    useEffect(() => {
        if (selectedCreditCardId && activeCreditCardIds.has(selectedCreditCardId)) {
            return;
        }

        setSelectedCreditCardId(getDefaultCreditCardId(activeCreditCardIds, favoriteCreditCardId));
    }, [activeCreditCardIds, favoriteCreditCardId, selectedCreditCardId]);

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
            const parsed = parseCreditCardInvoiceCsv(text);
            const nextCreditCardId =
                selectedCreditCardId && activeCreditCardIds.has(selectedCreditCardId)
                    ? selectedCreditCardId
                    : getDefaultCreditCardId(activeCreditCardIds, favoriteCreditCardId);

            setSelectedCreditCardId(nextCreditCardId);
            setPreview(parsed);
            setConfirmation("");
            setFeedback({
                type: parsed.rows.length > 0 ? "success" : "error",
                message:
                    parsed.rows.length > 0
                        ? "CSV de faturas carregado. Revise o resumo antes de importar."
                        : "Nenhuma despesa ou encargo valido foi encontrado nesse CSV.",
            });
        } catch (error) {
            resetPreview();
            setFeedback({
                type: "error",
                message: error instanceof Error ? error.message : "Nao foi possivel ler esse CSV de faturas.",
            });
        } finally {
            event.target.value = "";
        }
    };

    const handleConfirmImport = async () => {
        if (!user || !finance || !preview || !selectedCreditCard || isImporting) {
            return;
        }

        if (confirmation.trim().toUpperCase() !== INVOICE_CSV_IMPORT_CONFIRMATION_TEXT) {
            setFeedback({
                type: "error",
                message: `Digite ${INVOICE_CSV_IMPORT_CONFIRMATION_TEXT} para confirmar a importacao.`,
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
            downloadFinanceBackupFile(rollbackBackup, "prism-backup-pre-import-faturas-csv");

            const result = buildCreditCardInvoiceImportSnapshot({
                finance,
                parsed: preview,
                creditCard: selectedCreditCard,
                userId: user.uid,
            });
            await updateFinance(result.finance);

            setFeedback({
                type: "success",
                message: `${result.createdTransactions} lancamentos de fatura importados em ${result.createdGroups} grupos. O estado anterior tambem foi exportado antes da importacao.`,
            });
            resetPreview();
        } catch (error) {
            console.error("Failed to import credit card invoice CSV:", error);
            setFeedback({
                type: "error",
                message: error instanceof Error ? error.message : "Nao foi possivel importar esse CSV de faturas agora.",
            });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <SettingsSection title="Importar faturas" description="Adiciona despesas e encargos de faturas de cartão. Compras parceladas viram uma única série, ligada a cada fatura pela coluna Fatura.">
            <div className="space-y-4">
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!finance || loading || activeCreditCards.length < 1}
                    className={SETTINGS_SECONDARY_BUTTON_CLASS}
                >
                    <FileSpreadsheet size={16} aria-hidden />
                    Escolher arquivo CSV
                </button>
                {activeCreditCards.length < 1 ? <p className="text-sm text-white/45">Cadastre um cartão antes de importar faturas.</p> : null}

                <SettingsFeedback feedback={feedback} />

                {preview ? (
                    <div className="max-w-2xl space-y-4 rounded-2xl border border-white/[0.08] bg-[#101010] p-4">
                        <p className="text-sm text-white/70">Confira o resumo, escolha o cartão e confirme. As despesas entram nas faturas correspondentes.</p>
                        <ImportPreviewStats preview={preview} />
                        <InvoiceTotalsPreview preview={preview} />

                        {(preview.skippedRows.length + preview.ignoredRows.length) > 0 ? (
                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/60">
                                <p className="font-medium text-white/80">Linhas que não serão importadas</p>
                                <ul className="mt-2 space-y-1">
                                    {[...preview.skippedRows, ...preview.ignoredRows].slice(0, 5).map((message) => (
                                        <li key={message}>{message}</li>
                                    ))}
                                </ul>
                                {(preview.skippedRows.length + preview.ignoredRows.length) > 5 ? <p className="mt-2">E mais {(preview.skippedRows.length + preview.ignoredRows.length) - 5}.</p> : null}
                            </div>
                        ) : null}

                        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
                            <SingleSelectCombobox
                                hideLabel
                                label="Cartão de destino"
                                value={selectedCreditCardId}
                                placeholder="Cartão de destino"
                                emptyMessage="Nenhum cartão ativo."
                                options={creditCardOptions}
                                onChange={setSelectedCreditCardId}
                                renderOptionContent={(option) => <span className="truncate text-sm text-white">{option.label}</span>}
                            />
                            <IconTextField
                                ariaLabel={`Digite ${INVOICE_CSV_IMPORT_CONFIRMATION_TEXT} para confirmar`}
                                icon={TextCursorInput}
                                value={confirmation}
                                onChange={setConfirmation}
                                placeholder={`Digite ${INVOICE_CSV_IMPORT_CONFIRMATION_TEXT}`}
                                disabled={isImporting}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={handleConfirmImport} disabled={!canImport} className={SETTINGS_PRIMARY_BUTTON_CLASS}>
                                <FileUp size={16} aria-hidden />
                                {isImporting ? "Importando..." : "Importar faturas"}
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
