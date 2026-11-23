import type { CreditCard, Wallet } from "../../../context/FinanceContext";
import { useFinanceActions } from "../../../context/FinanceContext";
import { useModal } from "../../../context/ModalContext";
import { BalanceModal } from "../../modal/BalanceModal";
import { ConfirmActionModal } from "../../modal/ConfirmActionModal";
import { CreditCardModal } from "../../modal/CreditCardModal";
import { DeleteCreditCardModal } from "../../modal/DeleteCreditCardModal";
import type { RegistryAssetAction, RegistryAssetKind } from "./registryAssetTypes";

export function useRegistryAssetActionHandler(kind: "wallet"):
    (asset: Wallet, action: RegistryAssetAction) => void;
export function useRegistryAssetActionHandler(kind: "creditCard"):
    (asset: CreditCard, action: RegistryAssetAction) => void;
export function useRegistryAssetActionHandler(kind: RegistryAssetKind) {
    const {
        permanentlyDeleteWallet,
        setCreditCardActive,
        setFavoriteCreditCard,
        setFavoriteWallet,
        setWalletActive,
    } = useFinanceActions();
    const { openModal } = useModal();

    return (asset: Wallet | CreditCard, action: RegistryAssetAction) => {
        const isWallet = kind === "wallet";

        if (action.id === "edit") {
            openModal(isWallet ? <BalanceModal mode="edit" walletId={asset.id} /> : <CreditCardModal mode="edit" creditCardId={asset.id} />);
            return;
        }

        if (action.id === "favorite") {
            void (isWallet ? setFavoriteWallet(asset.id) : setFavoriteCreditCard(asset.id));
            return;
        }

        if (action.id === "archive") {
            void (isWallet ? setWalletActive(asset.id, false) : setCreditCardActive(asset.id, false));
            return;
        }

        if (action.id === "restore") {
            void (isWallet ? setWalletActive(asset.id, true) : setCreditCardActive(asset.id, true));
            return;
        }

        if (action.id === "remove" && "closingDay" in asset) {
            openModal(<DeleteCreditCardModal creditCard={asset} />);
            return;
        }

        if (action.id === "remove") {
            openModal(
                <ConfirmActionModal
                    title="Excluir carteira em definitivo?"
                    description={`O cadastro "${asset.name}" será removido permanentemente.`}
                    consequences={[
                        "As transações e séries vinculadas serão excluídas, incluindo parcelas e ocorrências alteradas individualmente para outra carteira ou cartão.",
                        "Os lançamentos dessa carteira serão removidos. Compras no cartão e faturas pagas são mantidas; os pagamentos passam a constar sem carteira.",
                        "Para manter o histórico, use Arquivar. A exclusão permanente não pode ser desfeita.",
                    ]}
                    confirmLabel="Excluir em definitivo"
                    onConfirm={async () => {
                        if (asset.isActive) {
                            await setWalletActive(asset.id, false);
                        }
                        await permanentlyDeleteWallet(asset.id);
                    }}
                />,
            );
        }
    };
}
