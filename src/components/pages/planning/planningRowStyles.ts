import type { ItemIconTone } from "./planningTimelineTypes";

const ACTIVE_ICON_CLASS_NAMES: Record<ItemIconTone, string> = {
    income: "bg-emerald-500/12 text-emerald-200",
    expense: "bg-orange-500/12 text-orange-200",
    wishlist: "bg-rose-500/12 text-rose-200",
    neutral: "bg-white/[0.06] text-white/70",
};

const ACTIVE_AMOUNT_CLASS_NAMES: Record<ItemIconTone, string> = {
    income: "text-emerald-200",
    expense: "text-orange-200",
    wishlist: "text-rose-200",
    neutral: "text-white/78",
};

const ACTIVE_MARKER_CLASS_NAMES: Record<ItemIconTone, string> = {
    income: "bg-emerald-300",
    expense: "bg-orange-300",
    wishlist: "bg-rose-300",
    neutral: "bg-white/60",
};

export const PLANNING_ROW_BASE_CLASS_NAME =
    "flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-white/30";

export function getPlanningRowStateClassName(active: boolean): string {
    return active ? "text-white/90" : "text-white/40";
}

export function getPlanningRowHoverClassName(active: boolean): string {
    return active ? "hover:bg-white/[0.05]" : "hover:bg-white/[0.03] hover:text-white/60";
}

/** Indicador de inclusão no saldo: anel vazio quando ignorado. */
export function getPlanningRowMarkerClassName(iconTone: ItemIconTone, active: boolean): string {
    return active ? `border-transparent ${ACTIVE_MARKER_CLASS_NAMES[iconTone]}` : "border-white/25 bg-transparent";
}

export function getPlanningRowIconClassName(iconTone: ItemIconTone, active: boolean): string {
    if (!active) {
        return "bg-white/[0.04] text-white/35";
    }

    return ACTIVE_ICON_CLASS_NAMES[iconTone];
}

export function getPlanningRowAmountClassName(iconTone: ItemIconTone, active: boolean, overrideClassName?: string): string {
    if (!active) {
        return "text-white/30 line-through decoration-white/25";
    }

    return overrideClassName ?? ACTIVE_AMOUNT_CLASS_NAMES[iconTone];
}
