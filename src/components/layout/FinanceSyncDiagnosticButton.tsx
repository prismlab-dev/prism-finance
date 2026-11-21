import { useState } from "react";
import { useFinanceSync } from "../../context/FinanceContext";

export function FinanceSyncDiagnosticButton() {
    const sync = useFinanceSync();
    const [label, setLabel] = useState("Copiar diagnóstico");
    const handleCopy = () => {
        sync.copySyncDiagnostic()
            .then(() => setLabel("Diagnóstico copiado"))
            .catch(() => setLabel("Não foi possível copiar"));
    };
    return <button type="button" onClick={handleCopy} className="text-left text-xs text-orange-200 underline underline-offset-2 hover:text-orange-100">
        {label}
    </button>;
}
