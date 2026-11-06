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
}: IconTextFieldProps) {
    return (
        <label className={`${FIELD_ICON_CONTROL_CLASS} flex min-h-[50px] items-center gap-2 ${disabled ? "opacity-60" : ""}`}>
            <TransactionFieldIcon icon={icon} />
            <input
                aria-label={ariaLabel}
                type={type}
                autoComplete={autoComplete}
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
