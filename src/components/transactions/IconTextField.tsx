import { TextAlignStart, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { FIELD_EMBEDDED_INPUT_CLASS, FIELD_ICON_CONTROL_CLASS } from "./transactionForm.constants";
import { TransactionFieldIcon } from "./TransactionFieldIcon";

interface IconTextFieldProps {
    ariaLabel: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
    maxLength?: number;
    icon?: LucideIcon;
    type?: "text" | "password" | "email";
    autoComplete?: string;
    inputMode?: "text" | "decimal" | "numeric";
    id?: string;
    /** Alinha os dígitos em largura fixa (valores monetários). */
    tabular?: boolean;
    /** Ícone solto, sem a moldura quadrada (ex.: lupa da busca). */
    bareIcon?: boolean;
    /** Substitui o ícone por um elemento próprio (ex.: seletor de cor). */
    leading?: ReactNode;
    /** Ações no fim do campo (ex.: botões "Usar" e "Ícone padrão"). */
    trailing?: ReactNode;
}

export function IconTextField({
    ariaLabel,
    value,
    onChange,
    placeholder,
    disabled = false,
    maxLength,
    icon = TextAlignStart,
    type = "text",
    autoComplete,
    inputMode,
    id,
    tabular = false,
    bareIcon = false,
    leading,
    trailing,
}: IconTextFieldProps) {
    const Icon = icon;
    const Wrapper = trailing ? "div" : "label";
    return (
        <Wrapper className={`${FIELD_ICON_CONTROL_CLASS} flex min-h-[50px] items-center gap-2 ${disabled ? "opacity-60" : ""}`}>
            {leading ?? (bareIcon ? <Icon aria-hidden="true" size={16} className="shrink-0 text-white/45" /> : <TransactionFieldIcon icon={icon} />)}
            <input
                id={id}
                aria-label={ariaLabel}
                type={type}
                autoComplete={autoComplete}
                inputMode={inputMode}
                className={tabular ? `${FIELD_EMBEDDED_INPUT_CLASS} tabular-nums` : FIELD_EMBEDDED_INPUT_CLASS}
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                maxLength={maxLength}
            />
            {trailing}
        </Wrapper>
    );
}
