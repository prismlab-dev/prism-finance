import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { CommandPalette } from "./CommandPalette";
import { OPEN_COMMAND_PALETTE_EVENT } from "./openCommandPalette";

// A paleta abre por evento global (atalho no app); aqui disparamos o evento ao montar.
const meta = { title: "Componentes/Comum/CommandPalette", component: CommandPalette } satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

function OpenOnMount() {
    useEffect(() => {
        window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT));
    }, []);
    return <CommandPalette />;
}

export const Aberta: Story = { render: () => <OpenOnMount /> };
