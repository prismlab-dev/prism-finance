import { currencyFormatter } from "../../../lib/formatters";
export function formatRegistryCurrency(value: number): string {
    return currencyFormatter.format(value);
}
