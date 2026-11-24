import { useMemo } from "react";
import { CheckCheck, CircleCheckBig, Clock, Copy, Eye, LayoutList, Link, ListChecks, SquareArrowOutUpRight, SquareSlash, Trash2, TriangleAlert } from "lucide-react";
import type { TransactionContextAction, TransactionContextActionId } from "./transactionContextActions";
import { ContextMenu } from "../ui/ContextMenu";

export interface TransactionContextMenuState {
    transactionId: string;
    x: number;
    y: number;
}

interface TransactionContextMenuProps {
    state: TransactionContextMenuState | null;
    actions: TransactionContextAction[];
    onSelect: (action: TransactionContextAction) => void;
    onClose: () => void;
}

const ACTION_ICONS: Record<TransactionContextActionId, typeof Eye> = {
    open: SquareArrowOutUpRight,
    view_series: LayoutList,
    view_invoice: Link,
    view_expenses: Link,
    select: ListChecks,
    toggle_status: CircleCheckBig,
    pay_today: CheckCheck,
    post_card: CircleCheckBig,
    post_card_today: CheckCheck,
    ignore: SquareSlash,
    duplicate: Copy,
    delete_single: Trash2,
    delete_this_and_next: Trash2,
    delete_all: TriangleAlert,
};

function resolveActionIcon(action: TransactionContextAction): typeof Eye {
    if (action.id === "toggle_status" && action.nextStatus === "pending") {
        return Clock;
    }

    return ACTION_ICONS[action.id];
}

function buildActionSections(actions: TransactionContextAction[]): TransactionContextAction[][] {
    const primary = actions.filter((action) => action.id === "open" || action.id === "view_series" || action.id === "view_invoice" || action.id === "view_expenses");
    const destructive = actions.filter((action) => action.tone === "danger");
    const secondary = actions.filter((action) => !primary.includes(action) && action.tone !== "danger");

    return [primary, secondary, destructive].filter((section) => section.length > 0);
}

export function TransactionContextMenu({ state, actions, onSelect, onClose }: TransactionContextMenuProps) {
    const sections = useMemo(() => buildActionSections(actions), [actions]);

    return <ContextMenu point={state} width={260} ariaLabel="Ações da transação" sections={sections} onSelect={onSelect} getIcon={resolveActionIcon} onClose={onClose} />;
}
