import { TextAlignStart, type LucideIcon } from "lucide-react";
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
    inputMode?: "text" | "decimal";
    /** Ícone solto, sem a moldura quadrada (ex.: lupa da busca). */
    bareIcon?: boolean;
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
    bareIcon = false,
}: IconTextFieldProps) {
    const Icon = icon;
    return (
        <label className={`${FIELD_ICON_CONTROL_CLASS} flex min-h-[50px] items-center gap-2 ${disabled ? "opacity-60" : ""}`}>
            {bareIcon ? <Icon aria-hidden="true" size={16} className="shrink-0 text-white/45" /> : <TransactionFieldIcon icon={icon} />}
            <input
                aria-label={ariaLabel}
                type={type}
                autoComplete={autoComplete}
                inputMode={inputMode}
                className={FIELD_EMBEDDED_INPUT_CLASS}
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                maxLength={maxLength}
            />
        </label>
    );
}
