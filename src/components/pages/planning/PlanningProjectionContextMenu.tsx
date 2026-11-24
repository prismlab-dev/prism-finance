import { CalendarClock, CircleCheckBig, Pencil, SquareArrowOutUpRight, SquareSlash, Trash2, Undo2 } from "lucide-react";
import { useMemo } from "react";
import type { PlanningProjectionContextAction, PlanningProjectionContextActionId } from "./planningProjectionContextActions";
import { ContextMenu } from "../../ui/ContextMenu";

export interface PlanningProjectionContextMenuState {
    itemId: string;
    x: number;
    y: number;
}

interface PlanningProjectionContextMenuProps {
    state: PlanningProjectionContextMenuState | null;
    actions: PlanningProjectionContextAction[];
    onSelect: (action: PlanningProjectionContextAction) => void;
    onClose: () => void;
}

const ACTION_ICONS: Record<PlanningProjectionContextActionId, typeof Pencil> = {
    toggle: CircleCheckBig,
    edit: Pencil,
    move: CalendarClock,
    restore: Undo2,
    remove: Trash2,
};

function buildActionSections(actions: PlanningProjectionContextAction[]): PlanningProjectionContextAction[][] {
    const destructive = actions.filter((action) => action.tone === "danger");
    const primary = actions.filter((action) => action.tone !== "danger");

    return [primary, destructive].filter((section) => section.length > 0);
}

function resolveActionIcon(action: PlanningProjectionContextAction): typeof Pencil {
    if (action.id === "toggle" && action.label === "Desativar") {
        return SquareSlash;
    }

    if (action.id === "edit" && (action.itemType === "wishlist" || action.label.startsWith("Abrir "))) {
        return SquareArrowOutUpRight;
    }

    return ACTION_ICONS[action.id];
}

export function PlanningProjectionContextMenu({ state, actions, onSelect, onClose }: PlanningProjectionContextMenuProps) {
    const sections = useMemo(() => buildActionSections(actions), [actions]);

    return <ContextMenu point={state} width={240} ariaLabel="Acoes da projecao" sections={sections} onSelect={onSelect} getIcon={resolveActionIcon} onClose={onClose} />;
}
