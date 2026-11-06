import type { LucideIcon } from "lucide-react";
import type { MouseEvent } from "react";
import { getCategoryIconComponent } from "../../../lib/categoryIcons";
import type { ItemIconTone } from "./planningTimelineTypes";
import { formatCurrency } from "./planningTimelineUtils";
import {
    getPlanningRowAmountClassName,
    getPlanningRowHoverClassName,
    getPlanningRowIconClassName,
    getPlanningRowMarkerClassName,
    getPlanningRowStateClassName,
    PLANNING_ROW_BASE_CLASS_NAME,
} from "./planningRowStyles";

interface PlanningToggleRowProps {
    active: boolean;
    amount: number;
    label: string;
    iconTone: ItemIconTone;
    iconName: string | null;
    onToggle: (itemId: string) => void;
    toggleId: string;
    customIcon?: LucideIcon;
    onContextMenu?: (event: MouseEvent) => void;
}

export function PlanningToggleRow({ active, amount, label, iconTone, iconName, onToggle, toggleId, customIcon, onContextMenu }: PlanningToggleRowProps) {
    const categoryIconTone = iconTone === "income" || iconTone === "expense" ? iconTone : undefined;
    const Icon = customIcon ?? getCategoryIconComponent(iconName, categoryIconTone);
    const rowClassName = `${PLANNING_ROW_BASE_CLASS_NAME} ${getPlanningRowStateClassName(active)} ${getPlanningRowHoverClassName(active)}`;
    const iconClassName = getPlanningRowIconClassName(iconTone, active);
    const amountClassName = getPlanningRowAmountClassName(iconTone, active);

    return (
        <button
            type="button"
            onClick={() => onToggle(toggleId)}
            onContextMenu={onContextMenu}
            className={rowClassName}
            title={active ? "Ignorar" : "Ativar"}
            aria-pressed={active}
        >
            <div className="flex min-w-0 items-center gap-2.5">
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClassName}`}>
                    <Icon size={14} />
                </span>
                <span className={`min-w-0 flex-1 truncate text-[13px] ${active ? "font-medium" : ""}`}>{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className={`shrink-0 text-[13px] font-medium tabular-nums ${amountClassName}`}>{formatCurrency(amount)}</span>
                <span className={`h-2 w-2 shrink-0 rounded-full border ${getPlanningRowMarkerClassName(iconTone, active)}`} aria-hidden />
            </div>
        </button>
    );
}
