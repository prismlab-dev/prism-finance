import { Button } from "../ui/Button";
import { useFinanceSync } from "../../context/FinanceContext";
import { useModal } from "../../context/ModalContext";
import { ConfirmActionModal } from "../modal/ConfirmActionModal";

export function FinanceSyncRecoveryButton() {
    const sync = useFinanceSync();
    const { openModal } = useModal();
    const handleRecovery = () => openModal(
        <ConfirmActionModal
            title="Restaurar dados confirmados?"
            description="Todas as alterações ainda não sincronizadas deste dispositivo serão substituídas pela versão atual do banco."
            consequences={[
                "Antes da substituição, salvaremos uma cópia local e baixaremos um arquivo com essas alterações para você revisar ou restaurar nas configurações.",
                "Os dados já confirmados no banco não serão alterados. Se a cópia falhar ou houver uma nova edição durante o processo, a restauração será interrompida.",
            ]}
            confirmLabel="Salvar cópia e restaurar"
            onConfirm={sync.restoreConfirmedData}
        />,
    );
    return <Button variant="link" onClick={handleRecovery} className="text-xs! text-orange-200! underline hover:text-orange-100!">
        Restaurar dados confirmados
    </Button>;
}
