import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TextAlignStart, File } from "lucide-react";
import { loadTransactionDetailFlags, TRANSACTION_DETAILS_CHANGED_EVENT, type TransactionDetailFlags } from "../../supabase/finance/transactionDetailsService";

export function useTransactionDetailFlags(userId: string | undefined): TransactionDetailFlags | null {
    const [flags, setFlags] = useState<TransactionDetailFlags | null>(null);

    useEffect(() => {
        if (!userId) {
            return;
        }
        let active = true;
        const refresh = () => {
            loadTransactionDetailFlags(userId)
                .then((next) => active && setFlags(next))
                .catch(() => undefined);
        };
        refresh();
        window.addEventListener(TRANSACTION_DETAILS_CHANGED_EVENT, refresh);
        return () => {
            active = false;
            window.removeEventListener(TRANSACTION_DETAILS_CHANGED_EVENT, refresh);
        };
    }, [userId]);

    return userId ? flags : null;
}

function HoverDetail({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
    const anchorRef = useRef<HTMLSpanElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    const show = () => {
        const rect = anchorRef.current?.getBoundingClientRect();
        if (rect) {
            setPosition({ top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 296) });
        }
    };
    const hide = () => setPosition(null);

    return (
        <>
            <span
                ref={anchorRef}
                tabIndex={0}
                role="img"
                aria-label={label}
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
                className="inline-flex shrink-0 rounded text-zinc-500 outline-none transition-colors hover:text-zinc-200 focus-visible:text-zinc-200 focus-visible:ring-1 focus-visible:ring-white/40"
            >
                {icon}
            </span>
            {position &&
                createPortal(
                    <div
                        role="tooltip"
                        style={{ top: position.top, left: Math.max(8, position.left) }}
                        className="pointer-events-none fixed z-[1000] w-max max-w-[min(280px,calc(100vw-16px))] rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-[13px] font-normal leading-5 text-white/85 shadow-xl backdrop-blur-sm"
                    >
                        {children}
                    </div>,
                    document.body,
                )}
        </>
    );
}

export function TransactionDetailIndicators({ flags, transactionId }: { flags: TransactionDetailFlags | null; transactionId: string }) {
    const annotation = flags?.annotations.get(transactionId);
    const fileNames = flags?.attachmentNames.get(transactionId);
    if (!annotation && !fileNames) {
        return null;
    }
    return (
        <>
            {annotation && (
                <HoverDetail label="Ver anotação" icon={<TextAlignStart size={13} />}>
                    <p className="line-clamp-[8] whitespace-pre-wrap break-words">{annotation}</p>
                </HoverDetail>
            )}
            {fileNames && (
                <HoverDetail label="Ver arquivos anexados" icon={<File size={13} />}>
                    <ul className="space-y-0.5">
                        {fileNames.map((name, index) => (
                            <li key={`${name}-${index}`} className="truncate">
                                {name}
                            </li>
                        ))}
                    </ul>
                </HoverDetail>
            )}
        </>
    );
}
