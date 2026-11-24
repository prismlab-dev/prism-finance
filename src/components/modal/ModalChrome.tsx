import { X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useModal } from "../../context/ModalContext";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Surface } from "../ui/Surface";

// Moldura visual compartilhada pelos modais (mesmo padrão do formulário de transação).

export function ModalPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <Surface className={`flex max-h-full min-h-0 flex-col overflow-hidden p-4 text-white ${className}`.trim()}>
            {children}
        </Surface>
    );
}

interface ModalHeaderProps {
    title: string;
    children?: ReactNode;
    disabled?: boolean;
}

export function ModalHeader({ title, children, disabled = false }: ModalHeaderProps) {
    const { closeModal } = useModal();

    return (
        <header className="flex shrink-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
                <h2 className="ml-1 truncate text-sm uppercase opacity-50">{title}</h2>
                {children}
            </div>
            <IconButton onClick={closeModal} disabled={disabled} aria-label="Fechar modal" title="Fechar">
                <X size={15} />
            </IconButton>
        </header>
    );
}

export function ModalBody({ children, className = "" }: { children: ReactNode; className?: string }) {
    return <div className={`elegant-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto pr-1 ${className}`.trim()}>{children}</div>;
}

export function ModalError({ children }: { children: ReactNode }) {
    return <Alert tone="error" className="mt-3">{children}</Alert>;
}

/** `start` recebe ações secundárias (arquivar, excluir…); `children` ficam à direita. */
export function ModalFooter({ start, children }: { start?: ReactNode; children: ReactNode }) {
    return (
        <footer className="mt-4 flex shrink-0 flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap gap-1">{start}</div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">{children}</div>
        </footer>
    );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function ModalCancelButton({ children = "Cancelar", className = "", ...props }: ButtonProps) {
    const { closeModal } = useModal();
    return (
        <Button variant="secondary" onClick={closeModal} {...props} className={`min-w-24 ${className}`}>
            {children}
        </Button>
    );
}

export function ModalPrimaryButton({ className = "", ...props }: ButtonProps) {
    return <Button variant="success" {...props} className={`min-w-28 ${className}`} />;
}

/** Ação secundária do rodapé (lado esquerdo), no mesmo estilo dos botões Excluir/Duplicar da transação. */
export function ModalFooterAction({ tone = "neutral", className = "", ...props }: ButtonProps & { tone?: "neutral" | "danger" }) {
    const toneClass = tone === "danger" ? "border-red-400/25! text-red-200/80! hover:border-red-400/45! hover:text-red-100!" : "";
    return <Button variant="secondary" size="sm" {...props} className={`uppercase tracking-[0.04em] ${toneClass} ${className}`} />;
}
