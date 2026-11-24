import { CircleDollarSign, Flag, Image as ImageIcon, Link2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Category, WishItem, WishItemPriority } from "../../context/FinanceContext";
import { SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID, useFinanceActions, useFinanceCategories, useFinanceWishItems } from "../../context/FinanceContext";
import { DEFAULT_EXPENSE_CATEGORY_ID } from "../../context/finance/constants";
import { useModal } from "../../context/ModalContext";
import { extractCurrencyDigits, formatCurrencyFromDigits, parseCurrencyDigitsToNumber } from "../../lib/currencyMask";
import { WISH_ITEM_PRIORITY_OPTIONS } from "../../lib/wishlistPriority";
import { CategoryOptionContent } from "../transactions/TransactionFormParts";
import { IconTextField } from "../transactions/IconTextField";

import { SingleSelectCombobox, type ComboboxOptionBase } from "../transactions/SingleSelectCombobox";
import { ModalBody, ModalCancelButton, ModalFooter, ModalFooterAction, ModalHeader, ModalPanel, ModalPrimaryButton } from "./ModalChrome";
import { ModalStructure } from "./ModalStructure";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Alert } from "../ui/Alert";

interface CategoryOption extends ComboboxOptionBase {
    category: Category;
    level: 0 | 1;
    rootCategoryId: string;
    categoryId: string;
}

interface AddWishItemProps {
    mode?: "create" | "edit";
    wishItemId?: string;
    initialWishItem?: WishItem;
}

function normalizeUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    return `https://${trimmed}`;
}

export function AddWishItem({ mode = "create", wishItemId, initialWishItem }: AddWishItemProps) {
    const categories = useFinanceCategories();
    const wishItems = useFinanceWishItems();
    const { addWishItem, removeWishItem } = useFinanceActions();
    const { closeModal } = useModal();
    const [amountDigits, setAmountDigits] = useState("");
    const [categoryId, setCategoryId] = useState(DEFAULT_EXPENSE_CATEGORY_ID);
    const [priority, setPriority] = useState<WishItemPriority>(2);
    const [description, setDescription] = useState("");
    const [link, setLink] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const editingWishItem = useMemo(() => {
        if (mode !== "edit") {
            return null;
        }
        if (initialWishItem) {
            return initialWishItem;
        }
        if (!wishItemId) {
            return null;
        }
        return wishItems.find((item) => item.id === wishItemId) ?? null;
    }, [initialWishItem, mode, wishItemId, wishItems]);

    const availableCategories = useMemo(
        () => categories.filter((category) => category.type === "expense" && category.id !== SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID && category.isActive),
        [categories],
    );

    const categoryOptions = useMemo<CategoryOption[]>(() => {
        const subCategoriesByRoot = new Map<string, Category[]>();

        for (const category of availableCategories) {
            if (!category.parentId) {
                continue;
            }

            const rootCategories = subCategoriesByRoot.get(category.parentId) ?? [];
            rootCategories.push(category);
            subCategoriesByRoot.set(category.parentId, rootCategories);
        }

        return availableCategories
            .filter((category) => !category.parentId)
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
            .flatMap((rootCategory) => {
                const rootOption: CategoryOption = {
                    id: `root:${rootCategory.id}`,
                    label: rootCategory.name,
                    searchText: rootCategory.name,
                    category: rootCategory,
                    level: 0,
                    rootCategoryId: rootCategory.id,
                    categoryId: rootCategory.id,
                };

                const subCategoryOptions = (subCategoriesByRoot.get(rootCategory.id) ?? [])
                    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                    .map((subCategory) => ({
                        id: `sub:${subCategory.id}`,
                        label: subCategory.name,
                        searchText: `${subCategory.name} ${rootCategory.name}`,
                        category: subCategory,
                        level: 1 as const,
                        rootCategoryId: rootCategory.id,
                        categoryId: subCategory.id,
                    }));

                return [rootOption, ...subCategoryOptions];
            });
    }, [availableCategories]);

    const selectedCategoryOptionId = useMemo(() => {
        if (!categoryId) {
            return "";
        }

        const selectedOption = categoryOptions.find((option) => option.categoryId === categoryId);
        return selectedOption?.id ?? "";
    }, [categoryId, categoryOptions]);

    const amountValue = parseCurrencyDigitsToNumber(amountDigits);
    const normalizedDescription = description.trim();
    const normalizedLink = normalizeUrl(link);
    const normalizedImageUrl = normalizeUrl(imageUrl);
    const canSubmit = amountValue > 0 && normalizedDescription.length > 0 && categoryOptions.some((option) => option.categoryId === categoryId);
    const isEditMode = mode === "edit" && Boolean(editingWishItem);

    useEffect(() => {
        if (editingWishItem) {
            setAmountDigits(String(Math.round(editingWishItem.value * 100)));
            setCategoryId(editingWishItem.categoryId);
            setPriority(editingWishItem.priority);
            setDescription(editingWishItem.description);
            setLink(editingWishItem.link ?? "");
            setImageUrl(editingWishItem.imageUrl ?? "");
            return;
        }

        setAmountDigits("");
        setCategoryId(DEFAULT_EXPENSE_CATEGORY_ID);
        setPriority(2);
        setDescription("");
        setLink("");
        setImageUrl("");
    }, [editingWishItem]);

    const handleCategorySelect = (optionId: string) => {
        const selectedOption = categoryOptions.find((option) => option.id === optionId);
        if (!selectedOption) {
            return;
        }

        setCategoryId(selectedOption.categoryId);
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
            setSubmitting(false);
        } catch (error) {
            console.error("Failed to submit wish item modal:", error);
            setSubmitting(false);
        }
    };

    const handleSubmit = () =>
        runAction(async () => {
            const targetWishItem = editingWishItem;
            if ((mode === "edit" && !targetWishItem) || !canSubmit) {
                return false;
            }

            await addWishItem({
                id: targetWishItem?.id ?? uuidv4(),
                userId: targetWishItem?.userId ?? null,
                value: amountValue,
                categoryId,
                priority,
                description: normalizedDescription,
                link: normalizedLink,
                imageUrl: normalizedImageUrl,
                isActive: targetWishItem?.isActive ?? true,
                createdAt: targetWishItem?.createdAt ?? new Date().toISOString(),
            });

            return true;
        });

    const handleRemove = () =>
        runAction(async () => {
            if (!editingWishItem) {
                return false;
            }

            await removeWishItem(editingWishItem.id);
            return true;
        });

    return (
        <ModalStructure height="auto" width="620px">
            <ModalPanel>
                <ModalHeader title={isEditMode ? "Editando desejo" : "Novo desejo"} disabled={submitting} />

                <ModalBody className="flex flex-col gap-2">
                    {mode === "edit" && !editingWishItem ? <Alert tone="warning">Item não encontrado.</Alert> : null}

                    <IconTextField ariaLabel="Descrição" value={description} onChange={setDescription} placeholder="O que você quer comprar? Ex.: Kindle, tênis novo" />

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <IconTextField ariaLabel="Valor" value={formatCurrencyFromDigits(amountDigits)} onChange={(value) => setAmountDigits(extractCurrencyDigits(value))} placeholder="R$ 0,00" icon={CircleDollarSign} inputMode="numeric" tabular />

                        <SingleSelectCombobox
                            label="Categoria"
                            hideLabel
                            value={selectedCategoryOptionId}
                            placeholder="Selecione uma categoria"
                            emptyMessage="Nenhuma categoria disponível."
                            options={categoryOptions}
                            onChange={handleCategorySelect}
                            renderOptionContent={(option) => <CategoryOptionContent option={option} />}
                        />
                    </div>

                    <SegmentedControl
                        ariaLabel="Prioridade"
                        options={WISH_ITEM_PRIORITY_OPTIONS.map((option) => ({
                            value: option.value,
                            label: option.label,
                            icon: <Flag size={14} style={{ color: option.color }} />,
                            activeStyle: { color: option.color, backgroundColor: `${option.color}26` },
                        }))}
                        value={priority}
                        onChange={setPriority}
                    />

                    <IconTextField ariaLabel="Link do produto" value={link} onChange={setLink} placeholder="Link do produto (opcional)" icon={Link2} />
                    <IconTextField ariaLabel="Link da imagem" value={imageUrl} onChange={setImageUrl} placeholder="Link da imagem (opcional)" icon={ImageIcon} />
                </ModalBody>

                <ModalFooter
                    start={
                        isEditMode && editingWishItem ? (
                            <ModalFooterAction tone="danger" onClick={() => void handleRemove()} disabled={submitting}>
                                <Trash2 size={15} /> Remover
                            </ModalFooterAction>
                        ) : null
                    }
                >
                    <ModalCancelButton disabled={submitting} />
                    <ModalPrimaryButton onClick={() => void handleSubmit()} disabled={(mode === "edit" && !editingWishItem) || !canSubmit || submitting}>
                        {submitting ? "Salvando..." : "Salvar"}
                    </ModalPrimaryButton>
                </ModalFooter>
            </ModalPanel>
        </ModalStructure>
    );
}
