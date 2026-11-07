import { useState } from "react";
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCorners,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical } from "lucide-react";
import { DEFAULT_HOME_LAYOUT, HOME_WIDGETS, useHomeLayout, type HomeLayout, type HomeWidgetId } from "../../../lib/homeLayout";
import { SETTINGS_SECONDARY_BUTTON_CLASS } from "./SettingsSection";

// Listas 0..2 são as colunas da Home; 3 é a bandeja de ocultos. O id de cada lista é "list-<índice>".
const LIST_LABELS = ["Coluna 1", "Coluna 2", "Coluna 3", "Ocultos"] as const;
const HIDDEN = 3;
const LABELS = Object.fromEntries(HOME_WIDGETS.map((widget) => [widget.id, widget.label])) as Record<HomeWidgetId, string>;
const listId = (index: number) => `list-${index}`;

type Lists = HomeWidgetId[][];

function toLists(layout: HomeLayout): Lists {
    return [...layout.columns, layout.hidden].map((list) => [...list]);
}

function toLayout(lists: Lists): HomeLayout {
    return { columns: [lists[0], lists[1], lists[2]], hidden: lists[HIDDEN] };
}

function findList(lists: Lists, id: UniqueIdentifier): number {
    const asList = LIST_LABELS.findIndex((_, index) => listId(index) === id);
    return asList >= 0 ? asList : lists.findIndex((list) => list.includes(id as HomeWidgetId));
}

type WidgetChipProps = { id: HomeWidgetId; hidden: boolean; onToggle?: () => void; overlay?: boolean };

function WidgetChip({ id, hidden, onToggle, overlay = false }: WidgetChipProps) {
    return (
        <div
            className={`flex items-center gap-2 rounded-lg border bg-surface py-2 pl-1.5 pr-1 text-sm ${hidden ? "text-white/50" : "text-white/85"} ${
                overlay ? "cursor-grabbing border-white/30 shadow-xl shadow-black/40 ring-1 ring-white/10" : "cursor-grab border-white/[0.08]"
            }`}
        >
            <GripVertical aria-hidden className="h-4 w-4 shrink-0 text-white/30" />
            <span className="min-w-0 flex-1 truncate">{LABELS[id]}</span>
            <button
                type="button"
                title={hidden ? "Mostrar na Home" : "Ocultar da Home"}
                aria-label={`${hidden ? "Mostrar" : "Ocultar"} ${LABELS[id]}`}
                onClick={onToggle}
                // Espaço/Enter no botão não devem iniciar o arraste do item.
                onKeyDown={(event) => event.stopPropagation()}
                className="rounded-md p-1 text-white/40 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
                {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
        </div>
    );
}

function SortableWidget({ id, hidden, onToggle }: Omit<WidgetChipProps, "overlay">) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            {...attributes}
            {...listeners}
            aria-roledescription="widget arrastável"
            className={`rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${hidden ? "sm:w-[calc((100%-0.75rem)/3)]" : ""} ${
                isDragging ? "opacity-30" : ""
            }`}
        >
            <WidgetChip id={id} hidden={hidden} onToggle={onToggle} />
        </li>
    );
}

function WidgetList({ index, items, onToggle }: { index: number; items: HomeWidgetId[]; onToggle: (id: HomeWidgetId) => void }) {
    const { setNodeRef, isOver } = useDroppable({ id: listId(index) });
    const isHidden = index === HIDDEN;
    return (
        <div
            className={`rounded-xl border p-2 transition-colors ${isHidden ? "border-dashed sm:col-span-3" : ""} ${
                isOver ? "border-white/30 bg-white/[0.05]" : "border-white/[0.08] bg-white/[0.015]"
            }`}
        >
            <p className="px-1 pb-1.5 text-xs text-white/40">
                {LIST_LABELS[index]}
                {isHidden && items.length === 0 && " — arraste um widget para cá para tirá-lo da Home"}
            </p>
            <SortableContext id={listId(index)} items={items} strategy={isHidden ? rectSortingStrategy : verticalListSortingStrategy}>
                <ul ref={setNodeRef} aria-label={LIST_LABELS[index]} className={`flex min-h-12 flex-col gap-1.5 ${isHidden ? "sm:flex-row sm:flex-wrap" : ""}`}>
                    {items.map((id) => (
                        <SortableWidget key={id} id={id} hidden={isHidden} onToggle={() => onToggle(id)} />
                    ))}
                </ul>
            </SortableContext>
        </div>
    );
}

export function HomeLayoutEditor() {
    const [layout, setLayout] = useHomeLayout();
    // Durante o arraste as listas vivem num rascunho; só o drop grava a preferência.
    const [draft, setDraft] = useState<Lists | null>(null);
    const [activeId, setActiveId] = useState<HomeWidgetId | null>(null);
    const lists = draft ?? toLists(layout);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    function handleDragOver({ active, over }: DragOverEvent) {
        if (!over) return;
        const from = findList(lists, active.id);
        const to = findList(lists, over.id);
        if (from < 0 || to < 0 || from === to) return;
        // Troca de lista no hover, para os vizinhos abrirem espaço já na coluna de destino.
        const next = lists.map((list) => [...list]);
        next[from] = next[from].filter((id) => id !== active.id);
        const overIndex = next[to].indexOf(over.id as HomeWidgetId);
        next[to].splice(overIndex >= 0 ? overIndex : next[to].length, 0, active.id as HomeWidgetId);
        setDraft(next);
    }

    function handleDragEnd({ active, over }: DragEndEvent) {
        let next = lists;
        if (over) {
            const list = findList(lists, active.id);
            const from = lists[list].indexOf(active.id as HomeWidgetId);
            const to = lists[list].indexOf(over.id as HomeWidgetId);
            if (to >= 0 && from !== to) next = lists.map((items, index) => (index === list ? arrayMove(items, from, to) : items));
        }
        setLayout(toLayout(next));
        setDraft(null);
        setActiveId(null);
    }

    function toggle(id: HomeWidgetId) {
        const next = lists.map((list) => list.filter((item) => item !== id));
        next[findList(lists, id) === HIDDEN ? 0 : HIDDEN].push(id);
        setLayout(toLayout(next));
    }

    return (
        <div className="space-y-3">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={({ active }) => {
                    setDraft(toLists(layout));
                    setActiveId(active.id as HomeWidgetId);
                }}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={() => {
                    setDraft(null);
                    setActiveId(null);
                }}
            >
                <div className="grid gap-2 sm:grid-cols-3">
                    {lists.map((items, index) => (
                        <WidgetList key={index} index={index} items={items} onToggle={toggle} />
                    ))}
                </div>
                <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
                    {activeId && <WidgetChip id={activeId} hidden={findList(lists, activeId) === HIDDEN} overlay />}
                </DragOverlay>
            </DndContext>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-white/40">Arraste para reordenar. No teclado: Espaço para pegar, setas para mover, Espaço para soltar.</p>
                <button type="button" onClick={() => setLayout(DEFAULT_HOME_LAYOUT)} className={SETTINGS_SECONDARY_BUTTON_CLASS}>
                    Restaurar padrão
                </button>
            </div>
        </div>
    );
}
