import { roundToCents } from "./planningReportsUtils";
import { currencyFormatter } from "../../../lib/formatters";

export function formatReportCurrency(value: number): string {
    return currencyFormatter.format(roundToCents(value));
}

export function formatReportPercent(value: number | null): string {
    return value === null ? "--" : `${roundToCents(value).toFixed(1)}%`;
}
