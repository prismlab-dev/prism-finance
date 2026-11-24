import { Plus } from "lucide-react";
import { MonthPickerControl } from "../../common/MonthPickerControl";
import { Button } from "../../ui/Button";
import { formatMonthLabel, getCurrentMonthKey, shiftMonth } from "../statement/statementPageShared";

interface BudgetsToolbarProps {
    monthKey: string;
    onMonthChange: (monthKey: string) => void;
    /** Sem ele, o botão "Novo orçamento" não aparece (subpágina de um orçamento). */
    onCreate?: () => void;
}

export function BudgetsToolbar({ monthKey, onMonthChange, onCreate }: BudgetsToolbarProps) {
    return (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="min-w-56 flex-1 sm:flex-none">
                <MonthPickerControl
                    selectedMonth={monthKey}
                    onMonthChange={onMonthChange}
                    formatMonthLabel={formatMonthLabel}
                    shiftMonth={shiftMonth}
                    shortcutMonth={getCurrentMonthKey()}
                    shortcutLabel="Ir para o mês atual"
                />
            </div>
            {onCreate ? (
                <Button variant="solid" onClick={onCreate} className="h-[40px]">
                    <Plus size={15} />
                    Novo orçamento
                </Button>
            ) : null}
        </div>
    );
}
