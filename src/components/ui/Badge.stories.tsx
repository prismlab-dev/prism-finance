import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./Badge";

const meta = {
    title: "Componentes/UI/Badge",
    component: Badge,
    args: { children: "Rótulo" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Outline: Story = {};
export const Soft: Story = { args: { tone: "soft", size: "sm", children: "Inativo" } };
export const Success: Story = { args: { tone: "success", size: "sm", children: "Conectado" } };
export const Uppercase: Story = { args: { uppercase: true, children: "Atual" } };
export const CustomColors: Story = {
    args: { tone: "custom", uppercase: true, className: "border-amber-400/30 bg-amber-500/10 text-amber-200", children: "Pendente" },
};
