import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Route } from "react-router-dom";
import { fn } from "storybook/test";
import { SAMPLE_SNAPSHOT } from "../stories/mocks/sampleFinance";
import { MobileAccountCombobox } from "./MobileAccountCombobox";
import { MobileActionSheet } from "./MobileActionSheet";
import { MobileApp } from "./MobileApp";
import { MobileDrawer } from "./MobileDrawer";
import { MobileHeader, Money } from "./MobileHeader";
import { MobileHome } from "./MobileHome";
import { MobileListToolbar } from "./MobileListToolbar";
import { MobilePlanning } from "./MobilePlanning";
import { MobileProgressSummary } from "./MobileProgressSummary";
import { MobileReports } from "./MobileReports";
import { MobileSheet } from "./MobileSheet";
import { MobileStatement } from "./MobileStatement";
import { MobileTransactions } from "./MobileTransactions";
import { MobileWishlist } from "./MobileWishlist";
import { MobileAssetList, MobileAssetTotal } from "./registry/MobileAssetList";
import { MobileBeneficiariesSection } from "./registry/MobileBeneficiariesSection";
import { MobileCategoriesSection } from "./registry/MobileCategoriesSection";
import { MobileCreditCardsSection } from "./registry/MobileCreditCardsSection";
import { MobileRegistry } from "./registry/MobileRegistry";
import { MobileTagsSection } from "./registry/MobileTagsSection";
import { MobileWalletsSection } from "./registry/MobileWalletsSection";

// Versão mobile do app (largura de celular).
const meta = { title: "Telas/Mobile", parameters: { layout: "fullscreen" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const s = SAMPLE_SNAPSHOT;
const phone = (children: React.ReactNode) => <div className="mx-auto w-[390px] max-w-full">{children}</div>;

export const Aplicativo: Story = { name: "MobileApp", parameters: { route: "/home" }, render: () => <MobileApp routes={<Route path="*" element={null} />} /> };
export const Inicio: Story = { name: "Início", parameters: { route: "/home" }, render: () => phone(<MobileHome />) };
export const Transacoes: Story = { name: "Transações", parameters: { route: "/transactions" }, render: () => phone(<MobileTransactions />) };
export const Extrato: Story = { name: "Extrato", parameters: { route: "/statement" }, render: () => phone(<MobileStatement />) };
export const Planejamento: Story = { name: "Planejamento", parameters: { route: "/planning" }, render: () => phone(<MobilePlanning />) };
export const Relatorios: Story = { name: "Relatórios", parameters: { route: "/reports" }, render: () => phone(<MobileReports />) };
export const Desejos: Story = { name: "Lista de desejos", parameters: { route: "/wishlist" }, render: () => phone(<MobileWishlist />) };
export const Cadastros: Story = { name: "Cadastros", parameters: { route: "/registry" }, render: () => phone(<MobileRegistry />) };
export const CadastroCarteiras: Story = { name: "Cadastros — carteiras", parameters: { route: "/registry/wallets" }, render: () => phone(<MobileWalletsSection />) };
export const CadastroCartoes: Story = { name: "Cadastros — cartões", parameters: { route: "/registry/credit-cards" }, render: () => phone(<MobileCreditCardsSection />) };
export const CadastroBeneficiarios: Story = { name: "Cadastros — beneficiários", parameters: { route: "/registry/beneficiaries" }, render: () => phone(<MobileBeneficiariesSection />) };
export const CadastroCategorias: Story = { name: "Cadastros — categorias", parameters: { route: "/registry/categories" }, render: () => phone(<MobileCategoriesSection />) };
export const CadastroTags: Story = { name: "Cadastros — tags", parameters: { route: "/registry/tags" }, render: () => phone(<MobileTagsSection />) };

export const Cabecalho: Story = { name: "MobileHeader", render: () => phone(<MobileHeader />) };
export const Valor: Story = { name: "Money", render: () => <Money value={48340.5} className="text-2xl font-semibold" /> };
export const BarraDaLista: Story = { name: "MobileListToolbar", render: () => phone(<MobileListToolbar countLabel="4 carteiras" toggleLabel="Mostrar arquivadas" createLabel="Nova" onToggle={fn()} onCreate={fn()} />) };
export const ResumoDeProgresso: Story = { name: "MobileProgressSummary", render: () => phone(<MobileProgressSummary totalLabel="Total do mês" doneLabel="Pagas" pendingLabel="A pagar" done={6420} pending={2210} />) };
export const TotalDeContas: Story = { name: "MobileAssetTotal", render: () => phone(<MobileAssetTotal label="Patrimônio" items={s.wallets.map((wallet) => ({ id: wallet.id, color: wallet.color, value: wallet.balance }))} />) };
export const ListaDeContas: Story = {
    name: "MobileAssetList",
    render: () => phone(<MobileAssetList emptyMessage="Nada por aqui" onSelect={fn()} items={s.wallets.map((wallet, index) => ({ asset: wallet, isFavorite: index === 0, subtitle: "Conta", value: wallet.balance }))} />),
};
export const SeletorDeContas: Story = {
    name: "MobileAccountCombobox",
    render: () => {
        const [values, setValues] = useState<string[]>([s.wallets[0].id]);
        return phone(<MobileAccountCombobox label="Contas" placeholder="Escolha" emptyMessage="Nenhuma conta" accounts={s.wallets} values={values} onChange={setValues} />);
    },
};
export const FolhaDeAcoes: Story = {
    name: "MobileActionSheet",
    render: () => phone(<MobileActionSheet title="Transação" onSelect={fn()} onClose={fn()} actions={[{ id: "open", label: "Abrir" }, { id: "duplicate", label: "Duplicar" }, { id: "delete", label: "Excluir", tone: "danger" }]} />),
};
export const Folha: Story = { name: "MobileSheet", render: () => phone(<MobileSheet open onClose={fn()} title="Filtros"><p className="p-4 text-sm text-white/70">Conteúdo da folha.</p></MobileSheet>) };
export const Gaveta: Story = { name: "MobileDrawer", render: () => phone(<MobileDrawer open onClose={fn()} title="Menu"><p className="p-4 text-sm text-white/70">Itens do menu.</p></MobileDrawer>) };
