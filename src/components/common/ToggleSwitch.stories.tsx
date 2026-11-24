import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ToggleSwitch } from "./ToggleSwitch";

const meta = {
    title: "Componentes/Comum/ToggleSwitch",
    component: ToggleSwitch,
    args: { label: "Ativar notificações", checked: false, onChange: () => {} },
    render: (args) => {
        const [checked, setChecked] = useState(args.checked);
        return <ToggleSwitch {...args} checked={checked} onChange={setChecked} />;
    },
} satisfies Meta<typeof ToggleSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { checked: true } };
export const Disabled: Story = { args: { disabled: true } };
