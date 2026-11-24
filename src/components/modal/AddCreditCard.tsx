import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { CalendarCheck, CalendarClock, CircleDollarSign, CreditCard as CreditCardIcon, ImageUp, Landmark, Link2, RotateCcw, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { type CreditCard, type Wallet, useFinanceActions, useFinanceCreditCards, useFinanceWallets } from "../../context/FinanceContext";
import { useModal } from "../../context/ModalContext";
import { extractCurrencyDigits, formatCurrencyFromDigits, formatAmountInputFromValue, parseAmountInput } from "../../lib/currencyMask";
import {
    DEFAULT_CREDIT_CARD_ICON,
    DEFAULT_WALLET_COLOR,
    isDefaultCreditCardIcon,
    isDefaultWalletIcon,
    normalizeWalletColor,
    normalizeWalletIcon,
} from "../../lib/walletVisual";
import { WalletAvatar } from "../common/WalletAvatar";
import { DeleteCreditCardModal } from "./DeleteCreditCardModal";
import { IconTextField } from "../transactions/IconTextField";
import { DayOfMonthField } from "../transactions/DayOfMonthField";
import { SingleSelectCombobox, type ComboboxOptionBase } from "../transactions/SingleSelectCombobox";
import { WalletOptionContent } from "../transactions/TransactionFormParts";
import { TransactionFieldIcon } from "../transactions/TransactionFieldIcon";
import { ModalBody, ModalCancelButton, ModalError, ModalFooter, ModalFooterAction, ModalHeader, ModalPanel, ModalPrimaryButton } from "./ModalChrome";
import { Button } from "../ui/Button";
import { ColorField } from "../common/ColorField";
import { optimizeImageFile, normalizeHttpImageUrl } from "../../lib/imageUpload";
import { Alert } from "../ui/Alert";


interface AddCreditCardProps {
    mode?: "create" | "edit";
    creditCardId?: string;
    initialCreditCard?: CreditCard;
}

function parseDay(value: string): number {
    const parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed)) {
        return 1;
    }
    return Math.min(31, Math.max(1, parsed));
}

const NO_WALLET_OPTION_ID = "__no-wallet__";

interface BankWalletOption extends ComboboxOptionBase {
    wallet: Wallet | null;
}

export function AddCreditCard({ mode = "create", creditCardId, initialCreditCard }: AddCreditCardProps) {
    const creditCards = useFinanceCreditCards();
    const wallets = useFinanceWallets();
    const { addCreditCard, deleteCreditCard, setCreditCardActive } = useFinanceActions();
    const { closeModal, openModal } = useModal();

    const editingCreditCard = useMemo(() => {
        if (mode !== "edit") {
            return null;
        }
        if (initialCreditCard) {
            return initialCreditCard;
        }
        if (!creditCardId) {
            return null;
        }
        return creditCards.find((card) => card.id === creditCardId) ?? null;
    }, [creditCardId, creditCards, initialCreditCard, mode]);

    const [name, setName] = useState("");
    const [limitInput, setLimitInput] = useState("");
    const [closingDayInput, setClosingDayInput] = useState("10");
    const [dueDayInput, setDueDayInput] = useState("15");
    const [bankWalletId, setBankWalletId] = useState<string>("");
    const [cardColor, setCardColor] = useState(DEFAULT_WALLET_COLOR);
    const [customIcon, setCustomIcon] = useState<string | null>(null);
    const [iconUrlInput, setIconUrlInput] = useState("");
    const [uploadError, setUploadError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [isProcessingUpload, setIsProcessingUpload] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const activeWallets = useMemo(() => wallets.filter((wallet) => wallet.isActive), [wallets]);
    const selectableWallets = useMemo(
        () => wallets.filter((wallet) => wallet.isActive || wallet.id === bankWalletId),
        [bankWalletId, wallets],
    );
    const walletOptions = useMemo<BankWalletOption[]>(
        () => [
            { id: NO_WALLET_OPTION_ID, label: "Sem carteira vinculada", searchText: "sem carteira nenhuma", wallet: null },
            ...selectableWallets.map((wallet) => ({ id: wallet.id, label: wallet.name, searchText: wallet.name, wallet })),
        ],
        [selectableWallets],
    );

    useEffect(() => {
        if (mode === "edit") {
            if (!editingCreditCard) {
                return;
            }

            const normalizedIcon = normalizeWalletIcon(editingCreditCard.icon);
            const usingDefaultIcon = isDefaultWalletIcon(normalizedIcon) || isDefaultCreditCardIcon(normalizedIcon);

            setName(editingCreditCard.name);
            setLimitInput(formatAmountInputFromValue(editingCreditCard.limit));
            setClosingDayInput(String(editingCreditCard.closingDay));
            setDueDayInput(String(editingCreditCard.dueDay));
            setBankWalletId(editingCreditCard.bankWalletId ?? activeWallets[0]?.id ?? "");
            setCardColor(normalizeWalletColor(editingCreditCard.color));
            setCustomIcon(usingDefaultIcon ? null : normalizedIcon);
            setIconUrlInput(!usingDefaultIcon && /^https?:\/\//i.test(normalizedIcon) ? normalizedIcon : "");
            setUploadError("");
            setSubmitError("");
            return;
        }

        setName("");
        setLimitInput("");
        setClosingDayInput("10");
        setDueDayInput("15");
        setBankWalletId(activeWallets[0]?.id ?? "");
        setCardColor(DEFAULT_WALLET_COLOR);
        setCustomIcon(null);
        setIconUrlInput("");
        setUploadError("");
        setSubmitError("");
    }, [activeWallets, editingCreditCard, mode]);

    useEffect(() => {
        const fallbackWalletId = activeWallets[0]?.id ?? wallets[0]?.id ?? "";
        if (bankWalletId && !selectableWallets.some((wallet) => wallet.id === bankWalletId)) {
            setBankWalletId(fallbackWalletId);
        }
    }, [activeWallets, bankWalletId, selectableWallets, wallets]);

    const isEditMode = mode === "edit" && Boolean(editingCreditCard);
    const canSubmit = mode !== "edit" || Boolean(editingCreditCard);
    const normalizedName = name.trim();
    const resolvedColor = normalizeWalletColor(cardColor);
    const resolvedIcon = customIcon ?? DEFAULT_CREDIT_CARD_ICON;

    const previewCard = useMemo<Pick<CreditCard, "icon" | "name" | "color">>(
        () => ({
            icon: resolvedIcon,
            name: normalizedName || "Cartao",
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
            console.error("Failed to submit credit card modal:", error);
        }

        setSubmitting(false);
    };

    const handleSubmit = () =>
        runAction(async () => {
            if (!canSubmit || isProcessingUpload) {
                return false;
            }

            if (!normalizedName) {
                setSubmitError("Informe o nome do cartao.");
                return false;
            }

            if (!limitInput.trim()) {
                setSubmitError("Informe o limite do cartao.");
                return false;
            }

            const limit = parseAmountInput(limitInput);
            if (!Number.isFinite(limit) || limit < 0) {
                setSubmitError("Limite invalido.");
                return false;
            }

            const closingDay = parseDay(closingDayInput);
            const dueDay = parseDay(dueDayInput);

            setSubmitError("");

            await addCreditCard({
                id: editingCreditCard?.id ?? uuidv4(),
                name: normalizedName,
                icon: resolvedIcon,
                color: resolvedColor,
                limit,
                closingDay,
                dueDay,
                bankWalletId: bankWalletId.trim() || null,
                isActive: editingCreditCard?.isActive ?? true,
                createdAt: editingCreditCard?.createdAt ?? new Date().toISOString(),
            });

            return true;
        });

    const handleDelete = () =>
        runAction(async () => {
            if (!editingCreditCard) {
                return false;
            }

            await deleteCreditCard(editingCreditCard.id);
            return true;
        });

    const handleReactivate = () =>
        runAction(async () => {
            if (!editingCreditCard || editingCreditCard.isActive) {
                return false;
            }

            await setCreditCardActive(editingCreditCard.id, true);
            return true;
        });

    const openPermanentDeleteModal = () => {
        if (!editingCreditCard || editingCreditCard.isActive) {
            return;
        }

        openModal(<DeleteCreditCardModal creditCard={editingCreditCard} />);
    };

    return (
        <ModalPanel>
            <ModalHeader title={isEditMode ? "Editando cartão" : "Novo cartão"} disabled={submitting} />
            <form
                className="flex min-h-0 flex-1 flex-col"
                onSubmit={(event) => {
                    event.preventDefault();
                    void handleSubmit();
                }}
            >
                <ModalBody className="flex flex-col gap-2">
                    {mode === "edit" && !editingCreditCard && (
                        <Alert tone="warning">Cartão não encontrado.</Alert>
                    )}

                    <div className="flex items-stretch gap-2">
                        <label
                            className={`group relative flex shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-black/35 p-2 transition-colors ${isProcessingUpload ? "cursor-wait opacity-60" : "cursor-pointer hover:border-white/[0.24]"}`}
                            title="Enviar ícone (opcional)"
                        >
                            <WalletAvatar wallet={previewCard} className="h-[72px] w-[72px] rounded-xl border border-white/[0.12]" iconSize={30} iconStrokeWidth={1.7} />
                            <span className="absolute bottom-1.5 right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.16] bg-surface text-white/70 group-hover:text-white">
                                <ImageUp size={12} />
                            </span>
                            <input id="credit-card-file-upload" type="file" accept="image/*" onChange={handleFileUpload} className="sr-only" disabled={isProcessingUpload} aria-label="Enviar ícone" />
                        </label>

                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <IconTextField ariaLabel="Nome do cartão" value={name} onChange={setName} placeholder="Nome do cartão. Ex.: Cartão principal" icon={CreditCardIcon} maxLength={70} />
                            <IconTextField ariaLabel="Limite" value={limitInput} onChange={(value) => setLimitInput(formatCurrencyFromDigits(extractCurrencyDigits(value)))} placeholder="Limite" icon={CircleDollarSign} id="credit-card-limit" inputMode="numeric" tabular />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <DayOfMonthField label="Fecha dia" value={parseDay(closingDayInput)} onChange={(day) => setClosingDayInput(String(day))} icon={CalendarClock} />
                        <DayOfMonthField label="Vence dia" value={parseDay(dueDayInput)} onChange={(day) => setDueDayInput(String(day))} icon={CalendarCheck} />
                    </div>

                    <SingleSelectCombobox
                        hideLabel
                        label="Banco (carteira vinculada)"
                        value={bankWalletId || NO_WALLET_OPTION_ID}
                        placeholder="Selecione a carteira vinculada"
                        emptyMessage="Nenhuma carteira encontrada."
                        options={walletOptions}
                        onChange={(value) => setBankWalletId(value === NO_WALLET_OPTION_ID ? "" : value)}
                        renderOptionContent={(option) => <BankWalletOptionContent option={option} />}
                    />

                    <IconTextField
                        ariaLabel="URL da imagem"
                        value={iconUrlInput}
                        onChange={setIconUrlInput}
                        placeholder="Ou cole a URL de uma imagem"
                        icon={Link2}
                        id="credit-card-url-input"
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

                    <ColorField ariaLabel="Cor do cartão" value={cardColor} onChange={setCardColor} placeholder={DEFAULT_WALLET_COLOR} />

                    {uploadError && <p className="pl-1 text-sm text-amber-200">{uploadError}</p>}
                </ModalBody>

                {submitError ? <ModalError>{submitError}</ModalError> : null}

                <ModalFooter
                    start={
                        isEditMode && editingCreditCard ? (
                            <>
                                <ModalFooterAction onClick={() => (editingCreditCard.isActive ? void handleDelete() : void handleReactivate())} disabled={submitting}>
                                    {editingCreditCard.isActive ? <Trash2 size={15} /> : <RotateCcw size={15} />}
                                    {editingCreditCard.isActive ? "Arquivar" : "Reativar"}
                                </ModalFooterAction>
                                {!editingCreditCard.isActive ? (
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
                        {submitting ? "Salvando..." : isEditMode ? "Salvar" : "Criar cartão"}
                    </ModalPrimaryButton>
                </ModalFooter>
            </form>
        </ModalPanel>
    );
}

function BankWalletOptionContent({ option }: { option: BankWalletOption }) {
    if (option.wallet) {
        return <WalletOptionContent option={{ label: option.label, wallet: option.wallet }} />;
    }

    return (
        <div className="flex items-center gap-2">
            <TransactionFieldIcon icon={Landmark} />
            <span className="truncate text-white/70">{option.label}</span>
        </div>
    );
}
