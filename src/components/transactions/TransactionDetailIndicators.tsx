import { useEffect, useState, type ReactNode } from "react";
import { TextAlignStart, File } from "lucide-react";
import { HoverTooltip } from "../common/HoverTooltip";
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
    return (
        <HoverTooltip
            label={label}
            content={children}
            className="inline-flex shrink-0 rounded text-zinc-500 outline-none transition-colors hover:text-zinc-200 focus-visible:text-zinc-200 focus-visible:ring-1 focus-visible:ring-white/40"
        >
            {icon}
        </HoverTooltip>
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
