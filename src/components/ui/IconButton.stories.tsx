import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronLeft, X } from "lucide-react";
import { IconButton } from "./IconButton";

const meta = {
    title: "Componentes/UI/IconButton",
    component: IconButton,
    args: { "aria-label": "Fechar", children: <X size={15} /> },
    argTypes: { variant: { control: "inline-radio", options: ["outline", "ghost", "bare", "danger"] },
        size: { control: "inline-radio", options: ["xs", "sm", "md", "lg"] },
        shape: { control: "inline-radio", options: ["round", "square"] },
    },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Outline: Story = { args: { variant: "outline" } };
export const Ghost: Story = { args: { variant: "ghost", "aria-label": "Mês anterior", children: <ChevronLeft size={16} /> } };
export const Bare: Story = { args: { variant: "bare", shape: "square", size: "sm", "aria-label": "Baixar" } };
export const Danger: Story = { args: { variant: "danger", shape: "square", size: "sm", "aria-label": "Remover" } };
export const Disabled: Story = { args: { disabled: true } };
