import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoadingPage, PageSkeletonScreen } from "./AppLoadingSkeleton";
import { ChartSkeleton, ModalSkeleton } from "./CompactSkeletons";
import { SkeletonBlock, SkeletonLine, SkeletonPanel } from "./SkeletonPrimitives";

const meta = { title: "Componentes/Carregamento/Skeletons", parameters: { layout: "fullscreen" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primitivos: Story = {
    name: "SkeletonBlock, SkeletonLine e SkeletonPanel",
    render: () => (
        <SkeletonPanel className="w-80 p-4">
            <SkeletonLine className="h-4 w-40" />
            <SkeletonBlock className="mt-3 h-24 w-full" />
            <SkeletonLine className="mt-3 h-3 w-24" />
        </SkeletonPanel>
    ),
};
export const Grafico: Story = { name: "ChartSkeleton", render: () => <div className="w-96"><ChartSkeleton /></div> };
export const Modal: Story = { name: "ModalSkeleton", render: () => <ModalSkeleton /> };
export const PaginaCarregando: Story = { name: "LoadingPage", render: () => <LoadingPage /> };
export const EsqueletoInicio: Story = { name: "PageSkeletonScreen — início", render: () => <PageSkeletonScreen page="home" /> };
export const EsqueletoExtrato: Story = { name: "PageSkeletonScreen — extrato", render: () => <PageSkeletonScreen page="statement" /> };
export const EsqueletoPlanejamento: Story = { name: "PageSkeletonScreen — planejamento", render: () => <PageSkeletonScreen page="planning" /> };
export const EsqueletoCadastros: Story = { name: "PageSkeletonScreen — cadastros", render: () => <PageSkeletonScreen page="registry" /> };
