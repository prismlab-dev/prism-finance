import { INVOICE_STATUS_LABELS, type InvoiceOption } from "./cardInvoiceOptions";
import { Badge } from "../ui/Badge";

const statusClasses: Record<InvoiceOption["visualStatus"], string> = {
    open: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
    future: "border-violet-300/35 bg-violet-500/15 text-violet-100",
    closed: "border-amber-400/30 bg-amber-500/15 text-amber-100",
    overdue: "border-red-400/35 bg-red-500/15 text-red-100",
    paid: "border-sky-400/30 bg-sky-500/15 text-sky-100",
    forecast: "border-sky-400/25 bg-sky-500/10 text-sky-200",
};
export function InvoiceOptionContent({ option }: { option: InvoiceOption }) {
    return <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="truncate text-sm text-white">{option.monthLabel}</p>
        <Badge tone="custom" uppercase className={statusClasses[option.visualStatus]}>
            {INVOICE_STATUS_LABELS[option.visualStatus]}
        </Badge>
    </div>;
}
