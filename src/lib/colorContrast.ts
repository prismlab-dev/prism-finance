// Contraste de cores escolhidas pelo usuário (carteiras, cartões, categorias, tags, beneficiários).
// Usa a sintaxe de cor relativa do CSS, então o ajuste acontece no navegador e acompanha o tema.

/** Ícone/texto sobre um fundo sólido `background`: branco em cores escuras, quase preto em cores claras. */
export function contentColorOn(background: string): string {
    return `oklch(from ${background} clamp(0.22, (0.68 - l) * 1000, 1) 0 0)`;
}

/**
 * A própria cor, com a luminosidade presa à faixa legível do tema atual
 * (clara nos temas escuros, escura nos claros). Para ícones sobre um fundo tingido da mesma cor.
 */
export function readableTint(color: string): string {
    return `oklch(from ${color} clamp(var(--tint-l-min), l, var(--tint-l-max)) c h)`;
}
