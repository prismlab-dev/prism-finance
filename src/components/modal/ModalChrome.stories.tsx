import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive, Trash2 } from "lucide-react";
import { fn } from "storybook/test";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { DisplayModal } from "./DisplayModal";
import {
    ModalBody,
    ModalCancelButton,
    ModalError,
    ModalFooter,
    ModalFooterAction,
    ModalHeader,
    ModalPanel,
    ModalPrimaryButton,
} from "./ModalChrome";
import { ModalStructure } from "./ModalStructure";
import { ModalProvider, useModal } from "../../context/ModalContext";

// Moldura compartilhada: toda caixa de diálogo do app é montada com estas peças (o "Dialog" do projeto).
const meta = { title: "Componentes/Modais/Moldura (Dialog)", parameters: { layout: "padded" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const DialogoCompleto: Story = {
    name: "ModalPanel — cabeçalho, corpo e rodapé",
    render: () => (
        <div className="h-[420px] w-[460px]">
            <ModalPanel className="h-full">
                <ModalHeader title="Nova carteira" />
                <ModalBody>
                    <p className="text-sm text-white/70">Conteúdo do diálogo: campos, listas e explicações.</p>
                </ModalBody>
                <ModalFooter start={<><ModalFooterAction><Archive size={13} /> Arquivar</ModalFooterAction><ModalFooterAction tone="danger"><Trash2 size={13} /> Excluir</ModalFooterAction></>}>
                    <ModalCancelButton />
                    <ModalPrimaryButton>Salvar</ModalPrimaryButton>
                </ModalFooter>
            </ModalPanel>
        </div>
    ),
};

export const ComErro: Story = {
    name: "ModalError",
    render: () => (
        <div className="w-[460px]">
            <ModalPanel>
                <ModalHeader title="Editar categoria" />
                <ModalError>Não foi possível salvar. Tente novamente.</ModalError>
            </ModalPanel>
        </div>
    ),
};

export const CabecalhoDesabilitado: Story = { name: "ModalHeader — desabilitado", render: () => <div className="w-[460px]"><ModalPanel><ModalHeader title="Salvando…" disabled /></ModalPanel></div> };

export const ConfirmarPerigo: Story = {
    name: "ConfirmActionModal — perigo",
    render: () => <ConfirmActionModal title="Excluir carteira" description="A carteira será removida." consequences={["Lançamentos continuam no histórico."]} confirmLabel="Excluir" onConfirm={fn()} />,
};
export const ConfirmarSucesso: Story = {
    name: "ConfirmActionModal — sucesso",
    render: () => <ConfirmActionModal title="Marcar como pago" description="Confirmar o pagamento desta fatura?" confirmLabel="Confirmar" tone="success" onConfirm={fn()} />,
};

export const EstruturaDoModal: Story = {
    name: "ModalStructure",
    render: () => (
        <ModalStructure width={420} height="auto" aside={<div className="rounded-xl border border-white/[0.09] bg-surface p-3 text-sm">Conteúdo lateral (aside)</div>}>
            <ModalPanel><ModalHeader title="Estrutura" /><ModalBody>Largura e altura controladas por props.</ModalBody></ModalPanel>
        </ModalStructure>
    ),
};

function OpenButton() {
    const { openModal } = useModal();
    return (
        <button type="button" className="rounded-xl border border-white/[0.12] px-3 py-2 text-sm" onClick={() => openModal(<ConfirmActionModal title="Excluir tag" description="Isto não pode ser desfeito." confirmLabel="Excluir" onConfirm={fn()} />)}>
            Abrir modal com fundo escurecido
        </button>
    );
}

export const ExibicaoDoModal: Story = {
    name: "DisplayModal (fundo + animação)",
    render: () => (
        <ModalProvider>
            <OpenButton />
            <DisplayModal />
        </ModalProvider>
    ),
};
