import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Header } from "./Header";
import { TransactionBlock } from "./TransactionBlock";
import { CreateTransaction } from "./Form";
import { HeaderMetricsRow } from "./header/HeaderMetricsRow";
import { HeaderNotifications } from "./header/HeaderNotifications";
import { HeaderProfileMenu } from "./header/HeaderProfileMenu";
import { HeaderSearch } from "./header/HeaderSearch";
import { HeaderSearchTrigger } from "./header/HeaderSearchTrigger";
import { SAMPLE_TRANSACTIONS } from "../../stories/mocks/sampleFinance";

const meta = { title: "Componentes/Cabeçalho/Topo do app", parameters: { layout: "fullscreen" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const TopoClassico: Story = { name: "Header — clássico", render: () => <Header onOpenSidebar={fn()} /> };
export const TopoLumen: Story = { name: "Header — Lumen", render: () => <Header onOpenSidebar={fn()} layout="lumen" /> };
export const Metricas: Story = {
    name: "HeaderMetricsRow",
    render: () => <HeaderMetricsRow amounts={{ balance: 48340, despesas: 4320.5, pendingInvoices: 1980, receitas: 8010 }} />,
};
export const Notificacoes: Story = { name: "HeaderNotifications", render: () => <HeaderNotifications /> };
export const MenuDoPerfil: Story = {
    name: "HeaderProfileMenu",
    render: () => <HeaderProfileMenu userName="Marina Souza" userPhotoUrl={null} onOpenSettings={fn()} onSignOut={async () => undefined} />,
};
export const Busca: Story = { name: "HeaderSearch", render: () => <HeaderSearch /> };
export const GatilhoDeBusca: Story = { name: "HeaderSearchTrigger", render: () => <HeaderSearchTrigger /> };
export const BlocoDeTransacao: Story = {
    name: "TransactionBlock",
    render: () => <div className="w-80"><TransactionBlock transaction={SAMPLE_TRANSACTIONS[0]} /></div>,
};
export const FormularioDeDespesa: Story = { name: "CreateTransaction — despesa", render: () => <div className="h-[640px] w-[480px]"><CreateTransaction type="spending" /></div> };
