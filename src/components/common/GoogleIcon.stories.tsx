import type { Meta, StoryObj } from "@storybook/react-vite";
import { GoogleIcon } from "./GoogleIcon";

const meta = { title: "Componentes/Comum/GoogleIcon", component: GoogleIcon } satisfies Meta<typeof GoogleIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};
