import { IconTextField } from "../transactions/IconTextField";

interface ColorSwatchInputProps {
    ariaLabel: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

/** Quadradinho de cor (`<input type="color">`) no formato usado dentro dos campos. */
export function ColorSwatchInput({ ariaLabel, value, onChange, disabled = false }: ColorSwatchInputProps) {
    return (
        <input
            aria-label={ariaLabel}
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="h-7 w-7 shrink-0 cursor-pointer rounded-md border border-white/[0.12] bg-transparent p-0.5"
        />
    );
}

interface ColorFieldProps {
    /** Nome acessível do seletor de cor (ex.: "Cor da carteira"). */
    ariaLabel: string;
    value: string;
    onChange: (value: string) => void;
    /** Exemplo exibido quando o código está vazio. */
    placeholder: string;
    disabled?: boolean;
}

/** Seletor de cor mais o código hexadecimal editável. */
export function ColorField({ ariaLabel, value, onChange, placeholder, disabled = false }: ColorFieldProps) {
    return (
        <IconTextField
            ariaLabel="Código da cor"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            leading={<ColorSwatchInput ariaLabel={ariaLabel} value={value} onChange={onChange} disabled={disabled} />}
        />
    );
}
