import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
    title: "Tokens/Tipografia",
    parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const SIZES = [
    { cls: "text-xs", use: "Legendas, rótulos (2º mais usado)" },
    { cls: "text-sm", use: "Texto padrão da interface (mais usado)" },
    { cls: "text-base", use: "Texto de destaque" },
    { cls: "text-lg", use: "Títulos de bloco" },
    { cls: "text-xl", use: "Títulos de seção" },
    { cls: "text-2xl", use: "Valores em cartões" },
    { cls: "text-3xl", use: "Valores de destaque" },
    { cls: "text-4xl", use: "Hero (raro)" },
];

export const Tamanhos: Story = {
    render: () => (
        <div className="space-y-4">
            {SIZES.map(({ cls, use }) => (
                <div key={cls} className="flex items-baseline gap-4">
                    <code className="w-20 shrink-0 font-mono text-xs text-white/60">{cls}</code>
                    <p className={cls}>R$ 12.480,90 — Saldo do mês</p>
                    <span className="hidden text-xs text-white/40 sm:inline">{use}</span>
                </div>
            ))}
        </div>
    ),
};

export const Pesos: Story = {
    render: () => (
        <div className="space-y-3">
            {[
                ["font-normal", "Texto corrido"],
                ["font-medium", "Rótulos e botões secundários"],
                ["font-semibold", "Ações principais e valores"],
            ].map(([cls, use]) => (
                <div key={cls} className="flex items-baseline gap-4">
                    <code className="w-28 shrink-0 font-mono text-xs text-white/60">{cls}</code>
                    <p className={`text-base ${cls}`}>Pagamento da fatura</p>
                    <span className="text-xs text-white/40">{use}</span>
                </div>
            ))}
        </div>
    ),
};

export const Familias: Story = {
    name: "Famílias",
    render: () => (
        <div className="space-y-4">
            <div>
                <code className="font-mono text-xs text-white/60">padrão — Spline Sans</code>
                <p className="mt-1 text-lg">Gastos por categoria 0123456789</p>
            </div>
            <div>
                <code className="font-mono text-xs text-white/60">.spline-sans-mono</code>
                <p className="spline-sans-mono mt-1 text-lg">R$ 1.234,56 · 0123456789</p>
            </div>
            <div>
                <code className="font-mono text-xs text-white/60">.azaret-mono</code>
                <p className="azaret-mono mt-1 text-lg">R$ 1.234,56 · 0123456789</p>
            </div>
        </div>
    ),
};
