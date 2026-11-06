import { Ban, CircleCheck, CircleDot, Clock, SkipForward, FunnelPlus, Search, Shapes, TrendingDown, TrendingUp, UserRound, X, type LucideIcon } from "lucide-react";
import { useFinanceBeneficiaries, useFinanceCategories, type Beneficiary, type Category, type TransactionStatus } from "../../../context/FinanceContext";
import { getCategoryIconComponent } from "../../../lib/categoryIcons";
import { BeneficiaryAvatar } from "../../common/BeneficiaryAvatar";
import { IconTextField } from "../../transactions/IconTextField";
import { SingleSelectCombobox, type ComboboxOptionBase } from "../../transactions/SingleSelectCombobox";
import { TransactionFieldIcon } from "../../transactions/TransactionFieldIcon";
import { FIELD_ICON_TRIGGER_CLASS } from "../../transactions/transactionForm.constants";
import { STATUS_LABELS, STATUS_ORDER, type CategoryFilterOption, type TagOption } from "./transactionsPageShared";

interface TransactionsFiltersPanelProps {
    showAdvancedFilters: boolean;
    searchQuery: string;
    selectedCategoryKey: string;
    selectedBeneficiary: string;
    selectedStatus: string;
    /** Status próprios da página (ex.: faturas); padrão são os status de transação. */
    statusOptions?: StatusFilterOption[];
    selectedTagIds: string[];
    minAmount: string;
    maxAmount: string;
    categoryOptions: CategoryFilterOption[];
    beneficiaryOptions: string[];
    tagOptions: TagOption[];
    hasAdvancedFilters: boolean;
    onToggleAdvancedFilters: () => void;
    onClearAdvancedFilters: () => void;
    onSearchQueryChange: (value: string) => void;
    onCategoryChange: (value: string) => void;
    onBeneficiaryChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onMinAmountChange: (value: string) => void;
    onMaxAmountChange: (value: string) => void;
    onTagToggle: (tagId: string) => void;
}

interface FilterOption extends ComboboxOptionBase {
    icon?: LucideIcon;
    category?: Pick<Category, "icon" | "type" | "color">;
    beneficiary?: Pick<Beneficiary, "name" | "avatarImage" | "avatarColor">;
    level?: 0 | 1;
}

const toOption = (id: string, label: string, extra: Partial<FilterOption> = {}): FilterOption => ({ id, label, searchText: label, ...extra });

function FilterOptionContent({ option, flat = false }: { option: FilterOption; flat?: boolean }) {
    const isSubcategory = option.level === 1 && !flat;
    let leading = option.icon ? <TransactionFieldIcon icon={option.icon} /> : null;
    if (option.category) {
        const Icon = getCategoryIconComponent(option.category.icon, option.category.type);
        leading = (
            <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/[0.12]"
                style={{ color: option.category.color ?? "#CBD5E1", backgroundColor: `${option.category.color ?? "#64748B"}22` }}
            >
                <Icon size={14} />
            </span>
        );
    } else if (option.beneficiary) {
        leading = <BeneficiaryAvatar beneficiary={option.beneficiary} className="h-7 w-7 shrink-0 rounded-full border border-white/[0.12]" />;
    }

    return (
        <span className={`flex min-w-0 items-center gap-2 ${isSubcategory ? "pl-3" : ""}`}>
            {isSubcategory && <span aria-hidden="true" className="h-px w-2 shrink-0 rounded-full bg-white/25" />}
            {leading}
            <span className="truncate">{option.label}</span>
        </span>
    );
}

const renderOption = (option: FilterOption) => <FilterOptionContent option={option} />;
const renderSelected = (option: FilterOption) => <FilterOptionContent option={option} flat />;
export interface StatusFilterOption {
    value: string;
    label: string;
    icon: LucideIcon;
}

const STATUS_ICONS: Record<TransactionStatus, LucideIcon> = { pending: Clock, paid: CircleCheck, cancelled: Ban, skipped: SkipForward };
const TRANSACTION_STATUS_OPTIONS: StatusFilterOption[] = STATUS_ORDER.map((status) => ({ value: status, label: STATUS_LABELS[status], icon: STATUS_ICONS[status] }));
const PILL_BUTTON_CLASS =
    "inline-flex min-h-[50px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors sm:flex-none";

export function TransactionsFiltersPanel({
    showAdvancedFilters,
    searchQuery,
    selectedCategoryKey,
    selectedBeneficiary,
    selectedStatus,
    statusOptions = TRANSACTION_STATUS_OPTIONS,
    selectedTagIds,
    minAmount,
    maxAmount,
    categoryOptions,
    beneficiaryOptions,
    tagOptions,
    hasAdvancedFilters,
    onToggleAdvancedFilters,
    onClearAdvancedFilters,
    onSearchQueryChange,
    onCategoryChange,
    onBeneficiaryChange,
    onStatusChange,
    onMinAmountChange,
    onMaxAmountChange,
    onTagToggle,
}: TransactionsFiltersPanelProps) {
    const categories = useFinanceCategories();
    const beneficiaries = useFinanceBeneficiaries();
    const categoryById = new Map(categories.map((category) => [`id:${category.id}`, category]));
    const beneficiaryByName = new Map(beneficiaries.map((beneficiary) => [beneficiary.name, beneficiary]));
    const categoryComboOptions = [
        toOption("all", "Todas as categorias", { icon: Shapes }),
        ...categoryOptions.map((option) => {
            const category = categoryById.get(option.value);
            const extra: Partial<FilterOption> = { level: option.level, searchText: `${option.label} ${option.parentLabel ?? ""}` };
            return toOption(option.value, option.label, category ? { ...extra, category } : { ...extra, icon: Shapes });
        }),
    ];
    const beneficiaryComboOptions = [
        toOption("all", "Todos os beneficiários", { icon: UserRound }),
        ...beneficiaryOptions.map((name) => toOption(name, name, { beneficiary: beneficiaryByName.get(name) ?? { name, avatarImage: null, avatarColor: null } })),
    ];
    const statusComboOptions = [toOption("all", "Todos os status", { icon: CircleDot }), ...statusOptions.map((option) => toOption(option.value, option.label, { icon: option.icon }))];
    const activeFilterCount =
        (selectedCategoryKey !== "all" ? 1 : 0) +
        (selectedBeneficiary !== "all" ? 1 : 0) +
        (selectedStatus !== "all" ? 1 : 0) +
        (minAmount.trim() ? 1 : 0) +
        (maxAmount.trim() ? 1 : 0) +
        selectedTagIds.length;

    return (
        <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                    <IconTextField ariaLabel="Buscar transações" icon={Search} bareIcon value={searchQuery} onChange={onSearchQueryChange} placeholder="Pesquise por qualquer coisa" />
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onToggleAdvancedFilters}
                        aria-expanded={showAdvancedFilters}
                        className={`${PILL_BUTTON_CLASS} ${
                            showAdvancedFilters ? "border-white/[0.24] bg-white/[0.08] text-white" : "border-white/[0.1] bg-black/35 text-white/75 hover:border-white/[0.2] hover:text-white"
                        }`}
                    >
                        <FunnelPlus size={15} />
                        Filtros
                        {activeFilterCount > 0 && <span className="rounded-full bg-emerald-400/15 px-1.5 text-xs font-semibold text-emerald-300">{activeFilterCount}</span>}
                    </button>
                    {hasAdvancedFilters && (
                        <button
                            type="button"
                            onClick={onClearAdvancedFilters}
                            aria-label="Limpar filtros"
                            className={`${PILL_BUTTON_CLASS} border-white/[0.1] bg-black/35 text-white/65 hover:border-white/[0.2] hover:text-white`}
                        >
                            <X size={15} />
                            <span className="sm:hidden xl:inline">Limpar</span>
                        </button>
                    )}
                </div>
            </div>

            {showAdvancedFilters && (
                <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <SingleSelectCombobox
                            hideLabel
                            label="Categoria"
                            value={selectedCategoryKey}
                            placeholder="Todas"
                            emptyMessage="Nenhuma categoria encontrada."
                            options={categoryComboOptions}
                            onChange={onCategoryChange}
                            renderOptionContent={renderOption}
                            renderSelectedContent={renderSelected}
                            triggerClassName={FIELD_ICON_TRIGGER_CLASS}
                        />
                        <SingleSelectCombobox
                            hideLabel
                            label="Beneficiário"
                            value={selectedBeneficiary}
                            placeholder="Todos"
                            emptyMessage="Nenhum beneficiário encontrado."
                            options={beneficiaryComboOptions}
                            onChange={onBeneficiaryChange}
                            renderOptionContent={renderOption}
                            triggerClassName={FIELD_ICON_TRIGGER_CLASS}
                        />
                        <SingleSelectCombobox
                            hideLabel
                            label="Status"
                            value={selectedStatus}
                            placeholder="Todos"
                            emptyMessage="Nenhum status encontrado."
                            options={statusComboOptions}
                            onChange={onStatusChange}
                            renderOptionContent={renderOption}
                            triggerClassName={FIELD_ICON_TRIGGER_CLASS}
                            disableSearch
                        />
                        <IconTextField ariaLabel="Valor mínimo" icon={TrendingUp} inputMode="decimal" value={minAmount} onChange={onMinAmountChange} placeholder="Valor mínimo" />
                        <IconTextField ariaLabel="Valor máximo" icon={TrendingDown} inputMode="decimal" value={maxAmount} onChange={onMaxAmountChange} placeholder="Valor máximo" />
                    </div>

                    {tagOptions.length > 0 && (
                        <div role="group" aria-label="Tags (qualquer uma)" className="flex flex-wrap gap-2">
                            {tagOptions.map((tag) => {
                                const selected = selectedTagIds.includes(tag.id);
                                const color = tag.color ?? "#64748B";
                                return (
                                    <button
                                        type="button"
                                        key={tag.id}
                                        onClick={() => onTagToggle(tag.id)}
                                        aria-pressed={selected}
                                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                            selected ? "border-white/30 text-white" : "border-white/[0.1] bg-black/35 text-white/65 hover:border-white/[0.2] hover:text-white"
                                        }`}
                                        style={selected ? { backgroundColor: `${color}40` } : undefined}
                                    >
                                        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                        {tag.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
