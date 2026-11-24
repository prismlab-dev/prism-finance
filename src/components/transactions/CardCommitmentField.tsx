import { SegmentedControl, type SegmentedOption } from "../ui/SegmentedControl";

type CardCommitmentValue = "forecast" | "posted";

interface CardCommitmentFieldProps {
    value: "forecast" | "posted";
    onChange: (value: "forecast" | "posted") => void;
    disabled?: boolean;
    postedDisabled?: boolean;
}

export function CardCommitmentField({ value, onChange, disabled = false, postedDisabled = false }: CardCommitmentFieldProps) {
    const options: SegmentedOption<CardCommitmentValue>[] = [
        {
            value: "forecast",
            label: "Previsto",
            title: "Ainda não foi efetivamente lançado no cartão",
            activeClassName: "bg-amber-500/20 text-amber-200",
        },
        {
            value: "posted",
            label: "Lançado",
            disabled: postedDisabled,
            title: postedDisabled ? "Ocorrências recorrentes futuras permanecem previstas até a data programada" : "Já compõe a fatura e o limite utilizado",
            activeClassName: "bg-emerald-500/20 text-emerald-200",
        },
    ];

    return <SegmentedControl ariaLabel="Status do gasto no cartão" options={options} value={value} onChange={onChange} disabled={disabled} />;
}
