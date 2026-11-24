import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus } from "lucide-react";
import { Button } from "./Button";

const meta = {
    title: "Componentes/UI/Button",
    component: Button,
    args: { children: "Salvar" },
    argTypes: {
        variant: { control: "inline-radio", options: ["secondary", "success", "danger", "solid", "ghost", "link"] },
        size: { control: "inline-radio", options: ["sm", "md", "lg"] },
        shape: { control: "inline-radio", options: ["rounded", "pill"] },
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Secondary: Story = { args: { variant: "secondary", children: "Cancelar" } };
export const Success: Story = { args: { variant: "success", children: "Confirmar" } };
export const Danger: Story = { args: { variant: "danger", children: "Excluir" } };
export const Solid: Story = { args: { variant: "solid", size: "lg", children: "Entrar" } };
export const Ghost: Story = { args: { variant: "ghost", children: "Voltar" } };
export const Link: Story = { args: { variant: "link", children: "Esqueci minha senha" } };
export const SmallPill: Story = { args: { variant: "secondary", size: "sm", shape: "pill", children: "Mostrar inativos" } };
export const Disabled: Story = { args: { variant: "success", disabled: true } };
export const WithIcon: Story = {
    args: { variant: "solid", children: (<><Plus size={15} /> Novo orçamento</>) },
};

export const AllVariants: Story = {
    render: (args) => (
        <div className="flex flex-wrap items-center gap-3">
            <Button {...args} variant="secondary">Cancelar</Button>
            <Button {...args} variant="success">Confirmar</Button>
            <Button {...args} variant="danger">Excluir</Button>
            <Button {...args} variant="solid">Continuar</Button>
            <Button {...args} variant="ghost">Voltar</Button>
            <Button {...args} variant="link">Esqueci</Button>
        </div>
    ),
};
