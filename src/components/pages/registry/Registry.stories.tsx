import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SAMPLE_SNAPSHOT } from "../../../stories/mocks/sampleFinance";
import { RegistryAssetContextMenu } from "./RegistryAssetContextMenu";
import { RegistryAssetRow } from "./RegistryAssetRow";
import { RegistryAssetSummary } from "./RegistryAssetSummary";
import { RegistryBeneficiariesSection } from "./RegistryBeneficiariesSection";
import { RegistryCategoriesSection } from "./RegistryCategoriesSection";
import { RegistryCreditCardCycle } from "./RegistryCreditCardCycle";
import { RegistryCreditCardsSection } from "./RegistryCreditCardsSection";
import { RegistryListItemEntrance } from "./RegistryListItemEntrance";
import { RegistrySectionActions } from "./RegistrySectionActions";
import { RegistrySectionHeader } from "./RegistrySectionHeader";
import { RegistryTagsSection } from "./RegistryTagsSection";
import { RegistryWalletsSection } from "./RegistryWalletsSection";
import { buildRegistryAssetActions } from "./registryAssetTypes";

// Seções da tela de Cadastros (carteiras, cartões, beneficiários, categorias, tags).
const meta = { title: "Componentes/Cadastros/Seções e linhas", parameters: { layout: "padded", route: "/registry" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const wallet = SAMPLE_SNAPSHOT.wallets[0];

export const SecaoDeCarteiras: Story = { name: "RegistryWalletsSection", render: () => <RegistryWalletsSection /> };
export const SecaoDeCartoes: Story = { name: "RegistryCreditCardsSection", render: () => <RegistryCreditCardsSection /> };
export const SecaoDeBeneficiarios: Story = { name: "RegistryBeneficiariesSection", render: () => <RegistryBeneficiariesSection /> };
export const SecaoDeCategorias: Story = { name: "RegistryCategoriesSection", render: () => <RegistryCategoriesSection /> };
export const SecaoDeTags: Story = { name: "RegistryTagsSection", render: () => <RegistryTagsSection /> };

export const Cabecalho: Story = {
    name: "RegistrySectionHeader",
    render: () => <RegistrySectionHeader title="Carteiras" visibleCount={4} isShowingInactive={false} showLabel="Mostrar arquivadas" hideLabel="Ocultar arquivadas" createLabel="Nova carteira" onToggleInactive={fn()} onCreate={fn()} />,
};
export const Acoes: Story = {
    name: "RegistrySectionActions",
    render: () => <RegistrySectionActions isShowingInactive={false} showLabel="Mostrar arquivadas" hideLabel="Ocultar arquivadas" createLabel="Nova carteira" onToggleInactive={fn()} onCreate={fn()} />,
};
export const Linha: Story = {
    name: "RegistryAssetRow",
    render: () => (
        <div className="w-[560px] space-y-2">
            <RegistryAssetRow asset={wallet} index={0} isFavorite favoriteLabel="Carteira favorita" subtitle="Conta corrente" valueLabel="Saldo" value="R$ 5.200,00" ariaLabel="Conta Corrente" onOpenContextMenu={fn()} />
            <RegistryAssetRow asset={{ ...wallet, name: "Poupança antiga", isActive: false }} index={1} isFavorite={false} favoriteLabel="" subtitle="Arquivada" value="-R$ 120,00" isValueNegative ariaLabel="Poupança antiga" onOpenContextMenu={fn()} />
        </div>
    ),
};
export const Resumo: Story = {
    name: "RegistryAssetSummary",
    render: () => (
        <div className="w-[560px]">
            <RegistryAssetSummary label="Patrimônio" countLabel="4 carteiras" distributionLabel="Distribuição" items={SAMPLE_SNAPSHOT.wallets.map((item) => ({ id: item.id, name: item.name, color: item.color, value: item.balance }))} />
        </div>
    ),
};
export const CicloDoCartao: Story = { name: "RegistryCreditCardCycle", render: () => <div className="w-80"><RegistryCreditCardCycle closingDay={10} dueDay={17} color="#8B5CF6" isActive /></div> };
export const Entrada: Story = {
    name: "RegistryListItemEntrance",
    render: () => <div className="w-72 space-y-2">{[0, 1, 2].map((index) => <RegistryListItemEntrance key={index} index={index}><div className="rounded-xl border border-white/[0.12] p-3 text-sm">Item {index + 1}</div></RegistryListItemEntrance>)}</div>,
};
export const MenuDeContexto: Story = {
    name: "RegistryAssetContextMenu",
    parameters: { layout: "fullscreen" },
    render: () => <RegistryAssetContextMenu state={{ assetId: wallet.id, x: 80, y: 40 }} actions={buildRegistryAssetActions({ kind: "wallet", isActive: true, isFavorite: false, hasActivity: true })} onSelect={fn()} onClose={fn()} />,
};
