/** Formatadores `Intl` compartilhados (pt-BR). Instanciados uma vez: criar `Intl.*Format` é caro. */

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
});

/** Números abreviados para eixos de gráfico, ex.: `12,5 mil`. */
export const compactFormatter = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}
