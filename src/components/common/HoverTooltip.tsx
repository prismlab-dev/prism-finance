import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface HoverTooltipProps {
    content: ReactNode;
    children: ReactNode;
    /** Classes do gatilho; recebe foco pelo teclado para mostrar o balão. */
    className?: string;
    label?: string;
    /** false quando o gatilho já é um botão focável. */
    focusable?: boolean;
}

/** Balão do app: vai para o body, então não é cortado por células com overflow. */
export function HoverTooltip({ content, children, className = "", label, focusable = true }: HoverTooltipProps) {
    const anchorRef = useRef<HTMLSpanElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    const show = () => {
        const rect = anchorRef.current?.getBoundingClientRect();
        if (rect) setPosition({ top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 296) });
    };
    const hide = () => setPosition(null);

    return (
        <>
            <span ref={anchorRef} tabIndex={focusable ? 0 : undefined} aria-label={label} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} className={className}>
                {children}
            </span>
            {position &&
                createPortal(
                    <div
                        role="tooltip"
                        style={{ top: position.top, left: Math.max(8, position.left) }}
                        className="pointer-events-none fixed z-[1000] w-max max-w-[min(280px,calc(100vw-16px))] rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-[13px] font-normal leading-5 text-white/85 shadow-xl backdrop-blur-sm"
                    >
                        {content}
                    </div>,
                    document.body,
                )}
        </>
    );
}
