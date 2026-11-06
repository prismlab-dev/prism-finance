import type { PointerEvent } from "react";
import { MAX_COLUMN_WIDTH_PERCENT, MIN_COLUMN_WIDTH_PERCENT } from "./tableColumnOrder";

interface ColumnResizeHandleProps {
    onWidthChange: (widthPercent: number) => void;
    onReset: () => void;
}

/** Alça na borda direita de um <th> (que precisa ser `relative`); a largura é salva em % da tabela. */
export function ColumnResizeHandle({ onWidthChange, onReset }: ColumnResizeHandleProps) {
    const handlePointerDown = (event: PointerEvent<HTMLSpanElement>) => {
        const header = event.currentTarget.parentElement;
        const table = header?.closest("table");
        if (!header || !table) return;

        event.preventDefault();
        const handle = event.currentTarget;
        handle.setPointerCapture(event.pointerId);
        const startX = event.clientX;
        const startWidth = header.getBoundingClientRect().width;
        const tableWidth = table.getBoundingClientRect().width;

        const handleMove = (moveEvent: globalThis.PointerEvent) => {
            const percent = ((startWidth + moveEvent.clientX - startX) / tableWidth) * 100;
            onWidthChange(Math.round(Math.min(MAX_COLUMN_WIDTH_PERCENT, Math.max(MIN_COLUMN_WIDTH_PERCENT, percent)) * 10) / 10);
        };
        const handleUp = () => {
            handle.removeEventListener("pointermove", handleMove);
            handle.removeEventListener("pointerup", handleUp);
            handle.removeEventListener("pointercancel", handleUp);
        };
        handle.addEventListener("pointermove", handleMove);
        handle.addEventListener("pointerup", handleUp);
        handle.addEventListener("pointercancel", handleUp);
    };

    return (
        <span
            role="separator"
            aria-orientation="vertical"
            title="Arraste para redimensionar · duplo clique para restaurar"
            onPointerDown={handlePointerDown}
            onDoubleClick={onReset}
            onClick={(event) => event.stopPropagation()}
            className="group/resize absolute inset-y-0 right-0 z-10 flex w-2.5 cursor-col-resize touch-none select-none justify-center"
        >
            <span className="my-1.5 w-px bg-white/[0.08] transition-colors group-hover/resize:bg-white/40 group-active/resize:bg-white/70" />
        </span>
    );
}
