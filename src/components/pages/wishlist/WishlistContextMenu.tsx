import { useMemo } from "react";
import { ExternalLink, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import type { WishlistContextAction, WishlistContextActionId } from "./wishlistContextActions";
import { ContextMenu } from "../../ui/ContextMenu";

export interface WishlistContextMenuState {
    wishItemId: string;
    x: number;
    y: number;
}

interface WishlistContextMenuProps {
    state: WishlistContextMenuState | null;
    actions: WishlistContextAction[];
    onSelect: (action: WishlistContextAction) => void;
    onClose: () => void;
}

const ACTION_ICONS: Record<WishlistContextActionId, typeof Pencil> = {
    create_expense: ShoppingCart,
    edit: Pencil,
    open_link: ExternalLink,
    remove: Trash2,
};

function buildActionSections(actions: WishlistContextAction[]): WishlistContextAction[][] {
    const destructive = actions.filter((action) => action.tone === "danger");
    const primary = actions.filter((action) => action.tone !== "danger");

    return [primary, destructive].filter((section) => section.length > 0);
}

export function WishlistContextMenu({ state, actions, onSelect, onClose }: WishlistContextMenuProps) {
    const sections = useMemo(() => buildActionSections(actions), [actions]);

    return (
        <ContextMenu
            point={state}
            width={240}
            ariaLabel="Acoes do item da lista de desejos"
            sections={sections}
            onSelect={onSelect}
            getIcon={(action) => ACTION_ICONS[action.id]}
            onClose={onClose}
        />
    );
}
