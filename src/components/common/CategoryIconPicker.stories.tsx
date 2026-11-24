import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { CategoryIconPicker } from "./CategoryIconPicker";

const meta = {
    title: "Componentes/Comum/CategoryIconPicker",
    component: CategoryIconPicker,
    args: { value: "utensils", categoryType: "expense", color: "#EF4444", onChange: () => undefined },
    render: (args) => {
        const [value, setValue] = useState(args.value);
        return <CategoryIconPicker {...args} value={value} onChange={setValue} />;
    },
} satisfies Meta<typeof CategoryIconPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Despesa: Story = {};
export const Receita: Story = { args: { value: "briefcase", categoryType: "income", color: "#0EA5E9" } };
