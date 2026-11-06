import type { Category, Transaction, TransactionStatus } from "../../../context/FinanceContext";
import { parseAppDate } from "../../../lib/localDate";

export type SortField = "date" | "value" | "status" | "wallet" | "description" | "category" | "beneficiary";
export type SortDirection = "asc" | "desc";
export type SortMode = `${SortField}-${SortDirection}`;
export type TransactionsTabKey = "income" | "spending" | "transfer";
export type TransactionsDateMode = "month" | "period";

export interface SelectOption {
    value: string;
    label: string;
}

export interface CategoryFilterOption extends SelectOption {
    level: 0 | 1;
    parentLabel?: string;
}

export interface TagOption {
    id: string;
    name: string;
    color: string | null;
}

export interface TransactionsSummary {
    paid: {
        count: number;
        amount: number;
    };
    pending: {
        count: number;
        amount: number;
    };
    total: {
        count: number;
        amount: number;
    };
}

export interface TransactionsFilterState {
    selectedMonth: string;
    dateMode: TransactionsDateMode;
    sortMode: SortMode;
    showAdvancedFilters: boolean;
    searchQuery: string;
    selectedCategoryKey: string;
    selectedWalletIds: string[];
    selectedBeneficiary: string;
    selectedStatus: "all" | TransactionStatus;
    selectedTagIds: string[];
    dateFrom: string;
    dateTo: string;
    minAmount: string;
    maxAmount: string;
}

export const STATUS_LABELS: Record<TransactionStatus, string> = {
    pending: "Pendente",
    paid: "Pago",
    cancelled: "Cancelada",
    skipped: "Ignorada",
};

export const STATUS_ORDER: TransactionStatus[] = ["pending", "paid", "cancelled", "skipped"];

export const STATUS_BADGE_CLASS: Record<TransactionStatus, string> = {
    pending: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    paid: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
    cancelled: "border-red-400/30 bg-red-500/10 text-red-200",
    skipped: "border-slate-400/25 bg-slate-500/10 text-slate-200",
};

export const SORT_DEFAULT_DIRECTION: Record<SortField, SortDirection> = {
    date: "desc",
    value: "desc",
    status: "asc",
    wallet: "asc",
    description: "asc",
    category: "asc",
    beneficiary: "asc",
};

export const SELECT_CLASS = "w-full rounded-full border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/[0.24]";
export const INPUT_CLASS = "w-full rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/[0.24]";

function padMonthPart(value: number): string {
    return String(value).padStart(2, "0");
}

export function getCurrentMonthKey(referenceDate = new Date()): string {
    return `${referenceDate.getFullYear()}-${padMonthPart(referenceDate.getMonth() + 1)}`;
}

export function getTransactionMonthKey(dateValue: string): string {
    const parsedDate = parseAppDate(dateValue);
    if (!parsedDate) {
        return getCurrentMonthKey();
    }

    return getCurrentMonthKey(parsedDate);
}

const monthLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
});

export function formatMonthLabel(monthKey: string): string {
    const [yearPart, monthPart] = monthKey.split("-");
    const year = Number(yearPart);
    const month = Number(monthPart);

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        return monthKey;
    }

    const formatted = monthLabelFormatter.format(new Date(year, month - 1, 1));
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export const INITIAL_FILTER_STATE: TransactionsFilterState = {
    selectedMonth: getCurrentMonthKey(),
    dateMode: "month",
    sortMode: "date-desc",
    showAdvancedFilters: false,
    searchQuery: "",
    selectedCategoryKey: "all",
    selectedWalletIds: [],
    selectedBeneficiary: "all",
    selectedStatus: "all",
    selectedTagIds: [],
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
};

export function shiftMonth(monthKey: string, offset: number): string {
    const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
    if (!match) {
        return getCurrentMonthKey();
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        return getCurrentMonthKey();
    }

    return getCurrentMonthKey(new Date(year, month - 1 + offset, 1));
}

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
});

export type AdvancedFilterValues = Pick<TransactionsFilterState, "selectedCategoryKey" | "selectedBeneficiary" | "selectedStatus" | "selectedTagIds" | "minAmount" | "maxAmount">;

export const EMPTY_ADVANCED_FILTERS: AdvancedFilterValues = {
    selectedCategoryKey: "all",
    selectedBeneficiary: "all",
    selectedStatus: "all",
    selectedTagIds: [],
    minAmount: "",
    maxAmount: "",
};

export function buildAdvancedFilterOptions(
    transactions: Transaction[],
    categories: Category[],
): { categoryOptions: CategoryFilterOption[]; tagOptions: TagOption[]; beneficiaryOptions: string[] } {
    const categoryLabelByKey = new Map<string, string>();
    const tagMap = new Map<string, TagOption>();
    const beneficiaries = new Set<string>();

    transactions.forEach((transaction) => {
        categoryLabelByKey.set(getTransactionCategoryKey(transaction), getTransactionCategoryLabel(transaction));
        transaction.tags.forEach((tag) => {
            if (!tagMap.has(tag.id)) tagMap.set(tag.id, { id: tag.id, name: tag.name, color: tag.color });
        });
        const beneficiary = transaction.beneficiary.trim();
        if (beneficiary) beneficiaries.add(beneficiary);
    });

    // Group used subcategories under their parent; the parent option also matches its subcategories.
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const childrenByRootKey = new Map<string, CategoryFilterOption[]>();
    const roots: CategoryFilterOption[] = [];
    const byLabel = (a: SelectOption, b: SelectOption) => a.label.localeCompare(b.label, "pt-BR");
    const ensureRoot = (key: string, label: string) => {
        if (!childrenByRootKey.has(key)) {
            childrenByRootKey.set(key, []);
            roots.push({ value: key, label, level: 0 });
        }
    };

    categoryLabelByKey.forEach((label, key) => {
        const category = categoryById.get(key.slice("id:".length));
        const parent = category?.parentId ? categoryById.get(category.parentId) : undefined;
        if (!parent) {
            ensureRoot(key, label);
            return;
        }
        const rootKey = `id:${parent.id}`;
        ensureRoot(rootKey, parent.name);
        childrenByRootKey.get(rootKey)?.push({ value: key, label: category?.name ?? label, level: 1, parentLabel: parent.name });
    });

    return {
        categoryOptions: roots.sort(byLabel).flatMap((root) => [root, ...(childrenByRootKey.get(root.value) ?? []).sort(byLabel)]),
        tagOptions: Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
        beneficiaryOptions: Array.from(beneficiaries).sort((a, b) => a.localeCompare(b, "pt-BR")),
    };
}

export function buildCategoryParentKeyMap(categories: Category[]): Map<string, string> {
    return new Map(categories.filter((category) => category.parentId).map((category) => [`id:${category.id}`, `id:${category.parentId}`]));
}

export function matchesAdvancedFilters(transaction: Transaction, filters: AdvancedFilterValues, parentKeyByCategoryKey?: ReadonlyMap<string, string>): boolean {
    const minValue = parseNumberish(filters.minAmount);
    const maxValue = parseNumberish(filters.maxAmount);
    const categoryKey = getTransactionCategoryKey(transaction);
    return (
        (filters.selectedCategoryKey === "all" || categoryKey === filters.selectedCategoryKey || parentKeyByCategoryKey?.get(categoryKey) === filters.selectedCategoryKey) &&
        (filters.selectedBeneficiary === "all" || transaction.beneficiary === filters.selectedBeneficiary) &&
        (filters.selectedStatus === "all" || transaction.status === filters.selectedStatus) &&
        (filters.selectedTagIds.length < 1 || filters.selectedTagIds.some((tagId) => transaction.tagIds.includes(tagId))) &&
        (minValue === null || transaction.value >= minValue) &&
        (maxValue === null || transaction.value <= maxValue)
    );
}

export function hasActiveAdvancedFilters(filters: AdvancedFilterValues): boolean {
    return (
        filters.selectedCategoryKey !== "all" ||
        filters.selectedBeneficiary !== "all" ||
        filters.selectedStatus !== "all" ||
        filters.selectedTagIds.length > 0 ||
        Boolean(filters.minAmount.trim()) ||
        Boolean(filters.maxAmount.trim())
    );
}

export function parseNumberish(value: string): number | null {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) {
        return null;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
        return null;
    }

    return Math.abs(parsed);
}

export function getTransactionCategoryKey(transaction: Transaction): string {
    if (transaction.category.id) {
        return `id:${transaction.category.id}`;
    }
    return "id:uncategorized";
}

export function getTransactionCategoryLabel(transaction: Transaction): string {
    return transaction.category.label;
}

export function getTransactionSearchSource(transaction: Transaction, walletName: string, destinationWalletName = ""): string {
    return [
        transaction.description,
        transaction.beneficiary,
        transaction.category.label,
        walletName,
        destinationWalletName,
        ...transaction.tags.map((tag) => tag.name),
    ].join(" ");
}

export function getSortField(sortMode: SortMode): SortField {
    return sortMode.split("-")[0] as SortField;
}

export function getSortDirection(sortMode: SortMode): SortDirection {
    return sortMode.split("-")[1] as SortDirection;
}

export function buildSortMode(field: SortField, direction: SortDirection): SortMode {
    return `${field}-${direction}`;
}

function compareByDateAsc(a: Transaction, b: Transaction): number {
    if (a.date === b.date) {
        return a.meta.criado_em.localeCompare(b.meta.criado_em);
    }

    return a.date.localeCompare(b.date);
}

function compareByDateDesc(a: Transaction, b: Transaction): number {
    if (a.date === b.date) {
        return b.meta.criado_em.localeCompare(a.meta.criado_em);
    }

    return b.date.localeCompare(a.date);
}

function compareByText(aValue: string, bValue: string): number {
    return aValue.localeCompare(bValue, "pt-BR", {
        sensitivity: "base",
    });
}

export function compareTransactions(a: Transaction, b: Transaction, sortMode: SortMode, walletNameById?: ReadonlyMap<string, string>): number {
    const field = getSortField(sortMode);
    const direction = getSortDirection(sortMode);

    if (field === "date") {
        return direction === "asc" ? compareByDateAsc(a, b) : compareByDateDesc(a, b);
    }

    if (field === "value") {
        const valueComparison = a.value - b.value;
        if (valueComparison !== 0) {
            return direction === "asc" ? valueComparison : -valueComparison;
        }

        return compareByDateDesc(a, b);
    }

    if (field === "status") {
        const statusComparison = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
        if (statusComparison !== 0) {
            return direction === "asc" ? statusComparison : -statusComparison;
        }

        return compareByDateDesc(a, b);
    }

    if (field === "wallet" || field === "description") {
        const textComparison =
            field === "wallet"
                ? compareByText(walletNameById?.get(a.inWallet) ?? "", walletNameById?.get(b.inWallet) ?? "")
                : compareByText(a.description.trim(), b.description.trim());
        if (textComparison !== 0) {
            return direction === "asc" ? textComparison : -textComparison;
        }

        return compareByDateDesc(a, b);
    }

    if (field === "category") {
        const categoryComparison = compareByText(getTransactionCategoryLabel(a), getTransactionCategoryLabel(b));
        if (categoryComparison !== 0) {
            return direction === "asc" ? categoryComparison : -categoryComparison;
        }

        return compareByDateDesc(a, b);
    }

    const beneficiaryComparison = compareByText(a.beneficiary.trim(), b.beneficiary.trim());
    if (beneficiaryComparison !== 0) {
        return direction === "asc" ? beneficiaryComparison : -beneficiaryComparison;
    }

    return compareByDateDesc(a, b);
}
