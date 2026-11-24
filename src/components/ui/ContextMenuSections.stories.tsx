import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pencil, Star, Trash2 } from "lucide-react";
import { ContextMenuSections, type ContextMenuAction } from "./ContextMenuSections";

const ICONS = { edit: Pencil, favorite: Star, delete: Trash2 };

const SECTIONS: ContextMenuAction[][] = [
    [
        { id: "edit", label: "Editar" },
        { id: "favorite", label: "Favoritar", disabled: true },
    ],
    [{ id: "delete", label: "Excluir", tone: "danger" }],
];

const meta = {
    title: "Componentes/UI/ContextMenuSections",
    component: ContextMenuSections<ContextMenuAction>,
    args: {
        sections: SECTIONS,
        onSelect: () => undefined,
        getIcon: (action) => ICONS[action.id as keyof typeof ICONS],
    },
    decorators: [
        (Story) => (
            <div role="menu" aria-label="Ações" className="w-[260px] rounded-2xl border border-white/[0.1] bg-surface/95 p-2 text-white shadow-2xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ContextMenuSections<ContextMenuAction>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
