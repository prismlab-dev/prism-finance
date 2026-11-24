import { Button } from "../ui/Button";
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
    return <Button variant="link" onClick={handleCopy} className="text-xs! text-orange-200! underline hover:text-orange-100!">
        {label}
    </Button>;
}
