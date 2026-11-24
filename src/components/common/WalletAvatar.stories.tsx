import type { Meta, StoryObj } from "@storybook/react-vite";
import { WalletAvatar } from "./WalletAvatar";

const meta = {
    title: "Componentes/Comum/WalletAvatar",
    component: WalletAvatar,
    args: { wallet: { icon: "/wallet.svg", name: "Conta Corrente", color: "#3B82F6" } },
} satisfies Meta<typeof WalletAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};
export const IconeLucide: Story = { args: { wallet: { icon: "lucide:credit-card", name: "Cartão Roxo", color: "#8B5CF6" } } };
export const Pequeno: Story = { args: { className: "h-7 w-7 rounded-lg border border-white/10", iconSize: 14 } };
