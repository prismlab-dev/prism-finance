import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { CircleDollarSign, ImageUp, Link2, RotateCcw, Sigma, Trash2, Wallet as WalletIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { type Wallet, useFinanceActions, useFinanceFavoriteWallet, useFinanceWallets } from "../../context/FinanceContext";
import { useModal } from "../../context/ModalContext";
import { extractCurrencyDigits, formatCurrencyFromDigits, formatAmountInputFromValue, parseAmountInput } from "../../lib/currencyMask";
import { DEFAULT_WALLET_COLOR, DEFAULT_WALLET_ICON, isDefaultWalletIcon, normalizeWalletColor, normalizeWalletIcon } from "../../lib/walletVisual";
import { ToggleSwitch } from "../common/ToggleSwitch";
import { WalletAvatar } from "../common/WalletAvatar";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { IconTextField } from "../transactions/IconTextField";
import { TransactionFieldIcon } from "../transactions/TransactionFieldIcon";
import { FIELD_ICON_CONTROL_CLASS } from "../transactions/transactionForm.constants";
import { ModalBody, ModalCancelButton, ModalError, ModalFooter, ModalFooterAction, ModalHeader, ModalPanel, ModalPrimaryButton } from "./ModalChrome";
import { Button } from "../ui/Button";
import { ColorField } from "../common/ColorField";
import { optimizeImageFile, normalizeHttpImageUrl } from "../../lib/imageUpload";
import { Alert } from "../ui/Alert";


interface AddWalletProps {
    mode?: "create" | "edit";
    walletId?: string;
    initialWallet?: Wallet;
}

export function AddWallet({ mode = "create", walletId, initialWallet }: AddWalletProps) {
    const wallets = useFinanceWallets();
    const favoriteWalletId = useFinanceFavoriteWallet();
    const { addWallet, deleteWallet, permanentlyDeleteWallet, setWalletActive } = useFinanceActions();
    const { closeModal, openModal } = useModal();

    const editingWallet = useMemo(() => {
        if (mode !== "edit") {
            return null;
        }
        if (initialWallet) {
            return initialWallet;
        }
        if (!walletId) {
            return null;
        }
        return wallets.find((wallet) => wallet.id === walletId) ?? null;
    }, [initialWallet, mode, walletId, wallets]);

    const [name, setName] = useState("");
    const [initialBalanceInput, setInitialBalanceInput] = useState("");
    const [walletColor, setWalletColor] = useState(DEFAULT_WALLET_COLOR);
    const [customIcon, setCustomIcon] = useState<string | null>(null);
    const [iconUrlInput, setIconUrlInput] = useState("");
    const [includeInMainTotals, setIncludeInMainTotals] = useState(true);
    const [uploadError, setUploadError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [isProcessingUpload, setIsProcessingUpload] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (mode === "edit") {
            if (!editingWallet) {
                return;
            }

            const normalizedIcon = normalizeWalletIcon(editingWallet.icon);
            const usingDefaultIcon = isDefaultWalletIcon(normalizedIcon);

            setName(editingWallet.name);
            setInitialBalanceInput(formatAmountInputFromValue(editingWallet.initialBalance));
            setWalletColor(normalizeWalletColor(editingWallet.color));
            setCustomIcon(usingDefaultIcon ? null : normalizedIcon);
            setIconUrlInput(!usingDefaultIcon && /^https?:\/\//i.test(normalizedIcon) ? normalizedIcon : "");
            setIncludeInMainTotals(editingWallet.includeInMainTotals);
            setUploadError("");
            setSubmitError("");
            return;
        }

        setName("");
        setInitialBalanceInput("");
        setWalletColor(DEFAULT_WALLET_COLOR);
        setCustomIcon(null);
        setIconUrlInput("");
        setIncludeInMainTotals(true);
        setUploadError("");
        setSubmitError("");
    }, [editingWallet, mode]);

    const isEditMode = mode === "edit" && Boolean(editingWallet);
    const isFavoriteWallet = editingWallet?.id === favoriteWalletId;
    const canSubmit = mode !== "edit" || Boolean(editingWallet);
    const normalizedName = name.trim();
    const resolvedColor = normalizeWalletColor(walletColor);
    const resolvedIcon = customIcon ?? DEFAULT_WALLET_ICON;

    const previewWallet = useMemo<Pick<Wallet, "icon" | "name" | "color">>(
        () => ({
            icon: resolvedIcon,
            name: normalizedName || "Carteira",
            color: resolvedColor,
        }),
        [normalizedName, resolvedColor, resolvedIcon],
    );

    const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) {
            return;
        }

        setUploadError("");
        setSubmitError("");
        setIsProcessingUpload(true);

        try {
            const optimized = await optimizeImageFile(file);
            setCustomIcon(optimized);
            setIconUrlInput("");
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : "Falha ao processar imagem.");
        } finally {
            setIsProcessingUpload(false);
        }
    };

    const applyImageUrl = () => {
        const normalizedUrl = normalizeHttpImageUrl(iconUrlInput);
        if (!normalizedUrl) {
            setUploadError("Informe uma URL valida iniciando com http(s)://");
            return;
        }

        setUploadError("");
        setSubmitError("");
        setCustomIcon(normalizedUrl);
    };

    const clearCustomIcon = () => {
        setCustomIcon(null);
        setIconUrlInput("");
        setUploadError("");
        setSubmitError("");
    };

    const runAction = async (action: () => Promise<boolean>) => {
        if (submitting) {
            return;
        }

        setSubmitting(true);

        try {
            const success = await action();
            if (success) {
                closeModal();
                return;
            }
        } catch (error) {
            console.error("Failed to submit wallet modal:", error);
        }

        setSubmitting(false);
    };

    const handleSubmit = () =>
        runAction(async () => {
            if (!canSubmit || isProcessingUpload) {
                return false;
            }

            if (!normalizedName) {
                setSubmitError("Informe o nome da carteira.");
                return false;
            }

            if (!initialBalanceInput.trim()) {
                setSubmitError("Informe o saldo inicial da carteira.");
                return false;
            }

            const initialBalance = parseAmountInput(initialBalanceInput);
            if (!Number.isFinite(initialBalance)) {
                setSubmitError("Saldo inicial invalido.");
                return false;
            }

            if (initialBalance < 0) {
                setSubmitError("Saldo inicial nao pode ser negativo.");
                return false;
            }

            setSubmitError("");

            const targetWallet = editingWallet;
            await addWallet({
                id: targetWallet?.id ?? uuidv4(),
                name: normalizedName,
                icon: resolvedIcon,
                type: targetWallet?.type ?? "checking",
                balance: initialBalance,
                initialBalance,
                currency: targetWallet?.currency ?? "BRL",
                color: resolvedColor,
                isActive: targetWallet?.isActive ?? true,
                includeInMainTotals,
                createdAt: targetWallet?.createdAt ?? new Date().toISOString(),
            });

            return true;
        });

    const handleDelete = () =>
        runAction(async () => {
            if (!editingWallet || isFavoriteWallet) {
                return false;
            }

            await deleteWallet(editingWallet.id);
            return true;
        });

    const handleReactivate = () =>
        runAction(async () => {
            if (!editingWallet || editingWallet.isActive) {
                return false;
            }

            await setWalletActive(editingWallet.id, true);
            return true;
        });

    const openPermanentDeleteModal = () => {
        if (!editingWallet || editingWallet.isActive || isFavoriteWallet) {
            return;
        }

        openModal(
            <ConfirmActionModal
                title="Excluir carteira em definitivo?"
                description={`A carteira "${editingWallet.name}" sera removida permanentemente.`}
                consequences={[
                    "Transacoes e transferencias ligadas a esta carteira serao removidas em definitivo.",
                    "Compras no cartao e faturas pagas serao mantidas; os pagamentos passam a constar sem carteira.",
                    "Cartoes vinculados serao mantidos, sem carteira associada.",
                ]}
                confirmLabel="Excluir em definitivo"
                onConfirm={() => permanentlyDeleteWallet(editingWallet.id)}
            />,
        );
    };

    return (
        <ModalPanel>
            <ModalHeader title={isEditMode ? "Editando carteira" : "Nova carteira"} disabled={submitting} />
            <form
                className="flex min-h-0 flex-1 flex-col"
                onSubmit={(event) => {
                    event.preventDefault();
                    void handleSubmit();
                }}
            >
                <ModalBody className="flex flex-col gap-2">
                    {mode === "edit" && !editingWallet && <Alert tone="warning">Carteira não encontrada.</Alert>}

                    <div className="flex items-stretch gap-2">
                        <label
                            className={`group relative flex shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-black/35 p-2 transition-colors ${isProcessingUpload ? "cursor-wait opacity-60" : "cursor-pointer hover:border-white/[0.24]"}`}
                            title="Enviar ícone (opcional)"
                        >
                            <WalletAvatar wallet={previewWallet} className="h-[72px] w-[72px] rounded-xl border border-white/[0.12]" iconSize={30} iconStrokeWidth={1.7} />
                            <span className="absolute bottom-1.5 right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.16] bg-surface text-white/70 group-hover:text-white">
                                <ImageUp size={12} />
                            </span>
                            <input id="wallet-file-upload" type="file" accept="image/*" onChange={handleFileUpload} className="sr-only" disabled={isProcessingUpload} aria-label="Enviar ícone" />
                        </label>

                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <IconTextField ariaLabel="Nome da carteira" value={name} onChange={setName} placeholder="Nome da carteira. Ex.: Banco X" icon={WalletIcon} maxLength={70} />
                            <IconTextField ariaLabel="Saldo inicial" value={initialBalanceInput} onChange={(value) => setInitialBalanceInput(formatCurrencyFromDigits(extractCurrencyDigits(value)))} placeholder="Saldo inicial" icon={CircleDollarSign} id="wallet-balance" inputMode="numeric" tabular />
                        </div>
                    </div>

                    <IconTextField
                        ariaLabel="URL da imagem"
                        value={iconUrlInput}
                        onChange={setIconUrlInput}
                        placeholder="Ou cole a URL de uma imagem"
                        icon={Link2}
                        id="wallet-url-input"
                        trailing={
                            <>
                                <Button variant="secondary" size="sm" className="uppercase tracking-[0.06em]" type="button" onClick={applyImageUrl} disabled={!iconUrlInput.trim()}>
                                    Usar
                                </Button>
                                <Button variant="secondary" size="sm" className="uppercase tracking-[0.06em]" type="button" onClick={clearCustomIcon}>
                                    Ícone padrão
                                </Button>
                            </>
                        }
                    />

                    <ColorField ariaLabel="Cor da carteira" value={walletColor} onChange={setWalletColor} placeholder={DEFAULT_WALLET_COLOR} />

                    <div className={`${FIELD_ICON_CONTROL_CLASS} flex min-h-[50px] items-center justify-between gap-3`}>
                        <span className="flex items-center gap-2 text-sm text-white/80">
                            <TransactionFieldIcon icon={Sigma} />
                            Contabilizar no saldo atual
                        </span>
                        <ToggleSwitch checked={includeInMainTotals} onChange={setIncludeInMainTotals} label="Contabilizar no saldo atual" />
                    </div>

                    {uploadError && <p className="pl-1 text-sm text-amber-200">{uploadError}</p>}
                </ModalBody>

                {submitError ? <ModalError>{submitError}</ModalError> : null}

                <ModalFooter
                    start={
                        isEditMode && editingWallet && !isFavoriteWallet ? (
                            <>
                                <ModalFooterAction onClick={() => (editingWallet.isActive ? void handleDelete() : void handleReactivate())} disabled={submitting}>
                                    {editingWallet.isActive ? <Trash2 size={15} /> : <RotateCcw size={15} />}
                                    {editingWallet.isActive ? "Arquivar" : "Reativar"}
                                </ModalFooterAction>
                                {!editingWallet.isActive ? (
                                    <ModalFooterAction tone="danger" onClick={openPermanentDeleteModal} disabled={submitting}>
                                        <Trash2 size={15} /> Excluir em definitivo
                                    </ModalFooterAction>
                                ) : null}
                            </>
                        ) : null
                    }
                >
                    <ModalCancelButton disabled={submitting} />
                    <ModalPrimaryButton type="submit" disabled={!canSubmit || isProcessingUpload || submitting}>
                        {submitting ? "Salvando..." : isEditMode ? "Salvar" : "Criar carteira"}
                    </ModalPrimaryButton>
                </ModalFooter>
            </form>
        </ModalPanel>
    );
}
