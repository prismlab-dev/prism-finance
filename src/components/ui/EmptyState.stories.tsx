import type { Meta, StoryObj } from "@storybook/react-vite";
import { Gift } from "lucide-react";
import { EmptyState } from "./EmptyState";

const meta = {
    title: "Componentes/UI/EmptyState",
    component: EmptyState,
    args: { children: "Nenhuma movimentação registrada" },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Soft: Story = {};
export const Dashed: Story = {
    args: { variant: "dashed", size: "lg", description: "Troque o mês ou limpe os filtros para ver outras transações." },
};
export const DashedWithIcon: Story = {
    args: { variant: "dashed", size: "lg", icon: <Gift size={22} />, children: "Nenhum desejo salvo ainda" },
};
export const Plain: Story = { args: { variant: "plain", size: "sm", children: "Nenhuma tag para os filtros atuais." } };
