import { useCallback, useMemo, type Dispatch, type SetStateAction } from "react";
import { useFinanceCreditCardInvoices, useFinanceStoredTransactions, type Transaction } from "../../context/FinanceContext";
import { isEditableInScope } from "../../context/finance/transactionSeries/installmentScope";
import { customInstallmentAmounts, NO_INSTALLMENT_OVERRIDES, spreadInstallmentDifference, type InstallmentOverrides } from "./installmentPreview";

export interface InstallmentSeriesEdit {
    /** Soma de todas as parcelas: o campo de valor mostra o gasto todo. */
    total: number;
    countInput: string;
    /** Parcelas ignoradas no início, riscadas na prévia. */
    ignoredCount: number;
    lockedIndexes: ReadonlySet<number>;
    initialOverrides: InstallmentOverrides;
    /** Mantém as travadas em qualquer mudança; "dividir igual" divide só o que sobra. */
    wrapSetOverrides: (setOverrides: Dispatch<SetStateAction<InstallmentOverrides>>, amount: number) => Dispatch<SetStateAction<InstallmentOverrides>>;
    /** Redistribui o novo total entre as parcelas não digitadas. */
    spreadTotal: (amount: number, overrides: InstallmentOverrides) => InstallmentOverrides;
    amounts: (amount: number, overrides: InstallmentOverrides) => number[];
    selectedIndex: number;
}

export function useInstallmentSeriesEdit(transaction: Transaction | null, enabled: boolean): InstallmentSeriesEdit | null {
    const storedTransactions = useFinanceStoredTransactions();
    const invoices = useFinanceCreditCardInvoices();

    const base = useMemo(() => {
        const selected = enabled && transaction ? storedTransactions.find((item) => item.id === transaction.id) : undefined;
        if (!selected) return null;
        const parcels = storedTransactions.filter((item) => item.groupId === selected.groupId).sort((a, b) => (a.installmentNumber ?? 1) - (b.installmentNumber ?? 1));
        const locked: InstallmentOverrides = {};
        const initialOverrides: InstallmentOverrides = {};
        parcels.forEach((parcel) => {
            const index = (parcel.installmentNumber ?? 1) - 1;
            const isLocked = parcel.status === "skipped" || !isEditableInScope(parcel, selected, "all", invoices);
            initialOverrides[index] = { amount: parcel.amount, manual: isLocked };
            if (isLocked) locked[index] = initialOverrides[index];
        });
        const firstOpen = parcels.findIndex((parcel) => parcel.status !== "skipped");
        return {
            locked,
            initialOverrides,
            total: parcels.reduce((cents, parcel) => cents + Math.round(parcel.amount * 100), 0) / 100,
            countInput: String(parcels.length),
            ignoredCount: firstOpen < 0 ? parcels.length : firstOpen,
            lockedIndexes: new Set(Object.keys(locked).map(Number)),
            selectedIndex: (selected.installmentNumber ?? 1) - 1,
        };
    }, [enabled, invoices, storedTransactions, transaction]);

    const spreadTotal = useCallback(
        (amount: number, overrides: InstallmentOverrides) => (base ? spreadInstallmentDifference(amount, base.countInput, { ...overrides, ...base.locked }) : overrides),
        [base],
    );

    const wrapSetOverrides = useCallback(
        (setOverrides: Dispatch<SetStateAction<InstallmentOverrides>>, amount: number): Dispatch<SetStateAction<InstallmentOverrides>> => (action) =>
            setOverrides((current) => {
                const next = typeof action === "function" ? action(current) : action;
                return next === NO_INSTALLMENT_OVERRIDES ? spreadTotal(amount, {}) : { ...next, ...base?.locked };
            }),
        [base, spreadTotal],
    );

    const amounts = useCallback(
        (amount: number, overrides: InstallmentOverrides) => (base ? customInstallmentAmounts(amount, Number(base.countInput), { ...overrides, ...base.locked }) ?? [] : []),
        [base],
    );

    return useMemo(() => (base ? { ...base, initialOverrides: base.initialOverrides, wrapSetOverrides, spreadTotal, amounts } : null), [amounts, base, spreadTotal, wrapSetOverrides]);
}
