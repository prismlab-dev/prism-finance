import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ColorField } from "./ColorField";

const meta = {
    title: "Componentes/Campos/ColorField",
    component: ColorField,
    args: { ariaLabel: "Cor da carteira", placeholder: "#4B5563", value: "#4B5563", onChange: () => undefined },
} satisfies Meta<typeof ColorField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: (args) => {
        const [color, setColor] = useState("#10B981");
        return (
            <div className="max-w-sm">
                <ColorField {...args} value={color} onChange={setColor} />
            </div>
        );
    },
};

export const Disabled: Story = {
    render: (args) => (
        <div className="max-w-sm">
            <ColorField {...args} disabled />
        </div>
    ),
};
