import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert } from "./Alert";

const meta = {
    title: "Componentes/UI/Alert",
    component: Alert,
    args: { children: "Não foi possível salvar a transação." },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Erro: Story = {};
export const Warning: Story = { args: { tone: "warning", children: "Carteira não encontrada." } };
export const Success: Story = { args: { tone: "success", children: "Alterações salvas." } };
