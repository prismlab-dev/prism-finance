import { Check } from "lucide-react";
import { Reorder } from "framer-motion";
import { useRef, useState } from "react";

interface TableColumnToggleButtonProps {
    label: string;
    active: boolean;
    onClick: () => void;
}

export function TableColumnToggleButton({ label, active, onClick }: TableColumnToggleButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`${
                active ? "bg-white/[0.09] text-white/90 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-white)_6%,transparent)]" : "text-white/35 hover:bg-white/[0.04] hover:text-white/65"
            } inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors`}
        >
            <Check size={12} strokeWidth={2.5} className={active ? "opacity-70" : "opacity-0"} aria-hidden />
            {label}
        </button>
    );
}

export interface TableColumnToggleOption<Key extends string> {
    key: Key;
    label: string;
    active: boolean;
}

interface TableColumnToggleBarProps<Key extends string> {
    columns: TableColumnToggleOption<Key>[];
    order: readonly Key[];
    onToggle: (key: Key) => void;
    onOrderChange: (order: Key[]) => void;
}

export function TableColumnToggleBar<Key extends string>({ columns, order, onToggle, onOrderChange }: TableColumnToggleBarProps<Key>) {
    const columnKeys = columns.map((column) => column.key);
    const [draftKeys, setDraftKeys] = useState<Key[] | null>(null);
    const isDraggingRef = useRef(false);
    // Animação de layout só durante o arraste; senão os itens "deslizam" quando algo acima da tabela muda de altura (ex.: abrir filtros).
    const [isDragging, setIsDragging] = useState(false);
    const visibleKeys = draftKeys ?? columnKeys;
    const columnsByKey = new Map(columns.map((column) => [column.key, column]));

    const commitOrder = () => {
        if (draftKeys) onOrderChange(mergeVisibleOrder(order, draftKeys));
        setDraftKeys(null);
        // O clique disparado ao soltar não deve alternar a coluna.
        window.setTimeout(() => {
            isDraggingRef.current = false;
            setIsDragging(false);
        });
    };

    return (
        <Reorder.Group
            as="div"
            axis="x"
            values={visibleKeys}
            onReorder={setDraftKeys}
            className="hidden items-center gap-0.5 rounded-lg border border-white/[0.07] bg-black/30 p-0.5 sm:flex"
            role="group"
            aria-label="Colunas visíveis (arraste para reordenar)"
        >
            {visibleKeys.map((key) => {
                const column = columnsByKey.get(key);
                if (!column) return null;
                return (
                    <Reorder.Item
                        key={key}
                        value={key}
                        as="div"
                        title="Arraste para reordenar"
                        onDragStart={() => {
                            isDraggingRef.current = true;
                            setIsDragging(true);
                        }}
                        transition={isDragging ? undefined : { layout: { duration: 0 } }}
                        onDragEnd={commitOrder}
                        whileDrag={{ scale: 1.06, zIndex: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}
                        className="relative cursor-grab touch-none select-none rounded-md bg-transparent active:cursor-grabbing"
                    >
                        <TableColumnToggleButton
                            label={column.label}
                            active={column.active}
                            onClick={() => {
                                if (!isDraggingRef.current) onToggle(key);
                            }}
                        />
                    </Reorder.Item>
                );
            })}
        </Reorder.Group>
    );
}

// Encaixa a nova ordem das colunas exibidas na ordem completa, mantendo as ocultas no lugar.
function mergeVisibleOrder<Key extends string>(order: readonly Key[], visibleOrder: readonly Key[]): Key[] {
    const visible = new Set(visibleOrder);
    let index = 0;
    return order.map((key) => (visible.has(key) ? visibleOrder[index++] : key));
}
