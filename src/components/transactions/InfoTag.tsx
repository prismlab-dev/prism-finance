import type { ReactNode } from "react";

/** Etiqueta discreta para informação curta, como a parcela ou a quantidade de ignoradas. */
export function InfoTag({ children, small = false }: { children: ReactNode; small?: boolean }) {
    return (
        <span className={`inline-block w-fit shrink-0 whitespace-nowrap bg-white/[0.08] text-white/65 tabular-nums ${small ? "rounded px-1.5 text-[10px]/4" : "rounded-md px-2 py-0.5 text-xs"}`}>
            {children}
        </span>
    );
}
