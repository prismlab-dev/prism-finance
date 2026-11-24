import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
    title: "Tokens/Arredondamento",
    parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const RADII = [
    { cls: "rounded-md", use: "Chips pequenos, tags, tooltips" },
    { cls: "rounded-lg", use: "Ações secundárias, itens de menu" },
    { cls: "rounded-xl", use: "Botões, campos, painéis de modal" },
    { cls: "rounded-2xl", use: "Cartões e blocos de página" },
    { cls: "rounded-3xl", use: "Superfícies grandes (raro)" },
    { cls: "rounded-full", use: "Botões de ícone, avatares, pílulas" },
];

export const Escala: Story = {
    render: () => (
        <div>
            <h2 className="text-lg font-semibold">Arredondamento</h2>
            <p className="mt-1 text-sm text-white/55">Do mais usado para o menos: <code>rounded-full</code>, <code>rounded-xl</code>, <code>rounded-lg</code>, <code>rounded-2xl</code>, <code>rounded-md</code>.</p>
            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3">
                {RADII.map(({ cls, use }) => (
                    <div key={cls}>
                        <div className={`h-20 border border-white/[0.18] bg-white/[0.06] ${cls}`} />
                        <p className="mt-2 font-mono text-xs text-white/85">{cls}</p>
                        <p className="text-xs text-white/50">{use}</p>
                    </div>
                ))}
            </div>
        </div>
    ),
};
