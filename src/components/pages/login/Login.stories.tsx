import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConfirmEmailPanel } from "./ConfirmEmailPanel";
import { LoginShowcase } from "./LoginShowcase";

const meta = { title: "Componentes/Login/Peças", parameters: { layout: "padded" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ConfirmarEmail: Story = { name: "ConfirmEmailPanel", render: () => <div className="w-[420px]"><ConfirmEmailPanel email="marina@exemplo.com" onBack={fn()} /></div> };
export const Vitrine: Story = { name: "LoginShowcase", parameters: { layout: "fullscreen" }, render: () => <div className="h-[720px]"><LoginShowcase /></div> };
