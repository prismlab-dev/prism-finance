import type { Meta, StoryObj } from "@storybook/react-vite";
import { Surface } from "./Surface";

const meta = {
    title: "Componentes/UI/Surface",
    component: Surface,
    args: { className: "p-4 text-sm text-white", children: "Conteúdo da superfície" },
} satisfies Meta<typeof Surface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Solid: Story = {};
export const Glass: Story = { args: { variant: "glass" } };
