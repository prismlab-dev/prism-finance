import type { Meta, StoryObj } from "@storybook/react-vite";
import { BeneficiaryAvatar } from "./BeneficiaryAvatar";

const meta = {
    title: "Componentes/Comum/BeneficiaryAvatar",
    component: BeneficiaryAvatar,
    args: { beneficiary: { name: "Carlos Souza", avatarImage: null, avatarColor: "#F97316" } },
} satisfies Meta<typeof BeneficiaryAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Iniciais: Story = {};
export const SemCor: Story = { args: { beneficiary: { name: "Rex", avatarImage: null, avatarColor: null } } };
export const Grande: Story = { args: { className: "h-14 w-14 rounded-full border border-white/[0.12]", textClassName: "text-lg font-semibold text-white" } };
