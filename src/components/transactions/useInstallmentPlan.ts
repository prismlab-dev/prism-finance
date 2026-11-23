import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { buildInstallmentPreview, NO_INSTALLMENT_OVERRIDES, spreadInstallmentDifference, type InstallmentOverrides, type InstallmentPlan } from "./installmentPreview";

interface UseInstallmentPlanParams {
    enabled: boolean;
    amount: number;
    countInput: string;
    ignoredCount?: number;
    startDate: string;
    showDay: boolean;
    disabled: boolean;
    overrides: InstallmentOverrides;
    setOverrides: Dispatch<SetStateAction<InstallmentOverrides>>;
    /** Precisa ser estável entre renderizações: o plano é publicado no modal a cada mudança. */
    setTotalAmount: (amount: number) => void;
    onChange?: (plan: InstallmentPlan | null) => void;
}

export function useInstallmentPlan({
    enabled, amount, countInput, ignoredCount, startDate, showDay, disabled, overrides, setOverrides, setTotalAmount, onChange,
}: UseInstallmentPlanParams): InstallmentPlan | null {
    const plan = useMemo<InstallmentPlan | null>(() => {
        if (!enabled) return null;

        const preview = buildInstallmentPreview({ amount, countInput, ignoredCount, startDate, showDay, overrides });
        return {
            preview,
            disabled,
            onAmountChange: (index, value) => setOverrides((current) => ({ ...current, [index]: { amount: value, manual: true } })),
            onSpread: () => setOverrides((current) => spreadInstallmentDifference(amount, countInput, current)),
            onUseSumAsTotal: () => {
                // Fixa os valores atuais antes: mudar o total refaria a divisão das demais.
                setOverrides((current) => Object.fromEntries(preview.rows.map((row) => [row.number - 1, { amount: row.amount, manual: Boolean(current[row.number - 1]?.manual) }])));
                setTotalAmount(preview.installmentsTotal);
            },
            onReset: () => setOverrides(NO_INSTALLMENT_OVERRIDES),
        };
    }, [amount, countInput, disabled, enabled, ignoredCount, overrides, setOverrides, setTotalAmount, showDay, startDate]);

    useEffect(() => {
        onChange?.(plan);
    }, [onChange, plan]);

    useEffect(() => {
        return () => onChange?.(null);
    }, [onChange]);

    return plan;
}
