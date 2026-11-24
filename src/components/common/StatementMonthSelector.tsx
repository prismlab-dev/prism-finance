import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { MonthGridPanel } from "./MonthGridPanel";
import { formatMonthLabel, shiftMonth } from "../../lib/monthKey";
import { IconButton } from "../ui/IconButton";
import { Surface } from "../ui/Surface";

interface StatementMonthSelectorProps {
    selectedMonth: string;
    onMonthChange: (value: string) => void;
    ariaLabel?: string;
}

export function StatementMonthSelector({ selectedMonth, onMonthChange, ariaLabel = "Selecionar mes e ano" }: StatementMonthSelectorProps) {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const pickerRef = useRef<HTMLDivElement | null>(null);
    const selectedMonthLabel = useMemo(() => formatMonthLabel(selectedMonth), [selectedMonth]);

    useEffect(() => {
        if (!isPickerOpen) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!pickerRef.current?.contains(event.target as Node)) {
                setIsPickerOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsPickerOpen(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("keydown", handleEscape);
        };
    }, [isPickerOpen]);

    return (
        <div ref={pickerRef} className=" relative inline-flex items-center gap-1 rounded-full border border-white/[0.12] bg-neutral-900 px-1 py-1 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-white)_10%,transparent)]">
            <IconButton variant="ghost" onClick={() => onMonthChange(shiftMonth(selectedMonth, -1))} aria-label="Mês anterior" title="Mês anterior">
                <ChevronLeft size={16} />
            </IconButton>
            <button
                type="button"
                onClick={() => setIsPickerOpen((current) => !current)}
                aria-expanded={isPickerOpen}
                aria-haspopup="dialog"
                aria-label={ariaLabel}
                className="inline-flex items-center justify-center gap-2 w-50 rounded-lg border border-white/0 bg-gradient-to-tl pl-1 py-1 pr-4.5 text-sm text-white outline-none transition-all hover:border-white/[0.24] hover:from-white/[0.12] hover:to-white/[0.04] focus-visible:border-white/[0.5]"
            >
                <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex h-6 w-6 items-center justify-center">
                        <CalendarDays size={15} />
                    </span>
                    <span className="text-sm font-medium">{selectedMonthLabel}</span>
                </span>
            </button>
            <IconButton variant="ghost" onClick={() => onMonthChange(shiftMonth(selectedMonth, 1))} aria-label="Próximo mês" title="Próximo mês">
                <ChevronRight size={16} />
            </IconButton>

            {isPickerOpen && (
                <Surface variant="glass" className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[240px] overflow-hidden p-2.5">

                    <MonthGridPanel
                        selectedMonth={selectedMonth}
                        onMonthChange={(monthKey) => {
                            onMonthChange(monthKey);
                            setIsPickerOpen(false);
                        }}
                    />
                </Surface>
            )}
        </div>
    );
}
