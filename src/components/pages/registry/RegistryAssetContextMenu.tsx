import { useMemo } from "react";
import { Archive, Pencil, RotateCcw, Star, Trash2 } from "lucide-react";
import type { RegistryAssetAction, RegistryAssetActionId, RegistryAssetMenuState } from "./registryAssetTypes";
import { ContextMenu } from "../../ui/ContextMenu";

interface RegistryAssetContextMenuProps {
    state: RegistryAssetMenuState | null;
    actions: RegistryAssetAction[];
    onSelect: (action: RegistryAssetAction) => void;
    onClose: () => void;
}

const ACTION_ICONS: Record<RegistryAssetActionId, typeof Pencil> = {
    edit: Pencil,
    favorite: Star,
    archive: Archive,
    restore: RotateCcw,
    remove: Trash2,
};

function buildSections(actions: RegistryAssetAction[]): RegistryAssetAction[][] {
    const regular = actions.filter((action) => action.tone !== "danger");
    const destructive = actions.filter((action) => action.tone === "danger");
    return [regular, destructive].filter((section) => section.length > 0);
}

export function RegistryAssetContextMenu({ state, actions, onSelect, onClose }: RegistryAssetContextMenuProps) {
    const sections = useMemo(() => buildSections(actions), [actions]);

    return (
        <ContextMenu
            point={state}
            width={250}
            ariaLabel="Ações do cadastro"
            sections={sections}
            onSelect={onSelect}
            getIcon={(action) => ACTION_ICONS[action.id]}
            getIconClassName={(action) => (action.id === "favorite" && action.disabled ? "fill-amber-200 text-amber-200" : undefined)}
            onClose={onClose}
            closeOnViewportChange
        />
    );
}
