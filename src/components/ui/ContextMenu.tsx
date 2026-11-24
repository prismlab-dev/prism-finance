import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { ContextMenuSections, type ContextMenuAction, type ContextMenuSectionsProps } from "./ContextMenuSections";

export interface ContextMenuPoint {
    x: number;
    y: number;
}

const MENU_PADDING = 12;
const MENU_VERTICAL_PADDING = 16;
const MENU_ITEM_HEIGHT = 40;
const MENU_DIVIDER_HEIGHT = 13;

function resolveMenuPosition(point: ContextMenuPoint, width: number, sections: ReadonlyArray<ReadonlyArray<unknown>>): { left: number; top: number } {
    if (typeof window === "undefined") {
        return { left: point.x, top: point.y };
    }

    const itemCount = sections.reduce((total, section) => total + section.length, 0);
    const dividerCount = Math.max(0, sections.length - 1);
    const menuHeight = MENU_VERTICAL_PADDING + itemCount * MENU_ITEM_HEIGHT + dividerCount * MENU_DIVIDER_HEIGHT;
    const spaceBelow = window.innerHeight - point.y - MENU_PADDING;
    // Abre para cima só quando não cabe embaixo e há espaço acima do ponto clicado.
    const shouldOpenUp = spaceBelow < menuHeight && point.y > menuHeight;
    const rawTop = shouldOpenUp ? point.y - menuHeight : point.y;

    return {
        left: Math.max(MENU_PADDING, Math.min(point.x, window.innerWidth - width - MENU_PADDING)),
        top: Math.max(MENU_PADDING, Math.min(rawTop, window.innerHeight - menuHeight - MENU_PADDING)),
    };
}

export interface ContextMenuProps<A extends ContextMenuAction> extends Pick<ContextMenuSectionsProps<A>, "sections" | "onSelect" | "getIcon" | "getIconClassName"> {
    /** Ponto (coordenadas da viewport) onde o menu foi aberto; `null` mantém o menu fechado. */
    point: ContextMenuPoint | null;
    /** Rótulo acessível do menu (`aria-label`). */
    ariaLabel: string;
    /** Largura em px; usada também para não deixar o menu vazar pela direita. */
    width?: number;
    onClose: () => void;
    /** Fecha também ao rolar a página ou redimensionar a janela (o ponto de origem deixaria de fazer sentido). */
    closeOnViewportChange?: boolean;
}

/**
 * Menu de contexto flutuante: portal no `body`, posicionado junto ao `point`, fechado por Esc ou clique fora.
 * Quem usa decide as seções, os ícones e o que cada ação faz.
 */
export function ContextMenu<A extends ContextMenuAction>({
    point,
    ariaLabel,
    width = 240,
    sections,
    onSelect,
    getIcon,
    getIconClassName,
    onClose,
    closeOnViewportChange = false,
}: ContextMenuProps<A>) {
    const menuRef = useRef<HTMLDivElement | null>(null);
    const position = useMemo(() => (point ? resolveMenuPosition(point, width, sections) : null), [point, sections, width]);

    useEffect(() => {
        if (!point) {
            return undefined;
        }

        function handleMouseDown(event: MouseEvent) {
            if (!menuRef.current?.contains(event.target as Node)) {
                onClose();
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("keydown", handleKeyDown);
        if (closeOnViewportChange) {
            window.addEventListener("resize", onClose);
            window.addEventListener("scroll", onClose, true);
        }

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("keydown", handleKeyDown);
            if (closeOnViewportChange) {
                window.removeEventListener("resize", onClose);
                window.removeEventListener("scroll", onClose, true);
            }
        };
    }, [closeOnViewportChange, onClose, point]);

    if (!point || !position) {
        return null;
    }

    return createPortal(
        <div
            ref={menuRef}
            role="menu"
            aria-label={ariaLabel}
            className="fixed z-[220] overflow-hidden rounded-2xl border border-white/[0.1] bg-surface/95 p-2 text-white shadow-2xl backdrop-blur-xl"
            style={{ left: position.left, top: position.top, width }}
        >
            <ContextMenuSections sections={sections} onSelect={onSelect} getIcon={getIcon} getIconClassName={getIconClassName} />
        </div>,
        document.body,
    );
}
