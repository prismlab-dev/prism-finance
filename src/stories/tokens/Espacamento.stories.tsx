import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
    title: "Tokens/Espaçamento",
    parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// Escala do Tailwind: 1 passo = 0,25rem (--spacing). "Principal" = os valores mais usados no app.
const STEPS = [
    { step: "0.5", main: false },
    { step: "1", main: true },
    { step: "1.5", main: true },
    { step: "2", main: true },
    { step: "2.5", main: false },
    { step: "3", main: true },
    { step: "4", main: true },
    { step: "5", main: false },
    { step: "6", main: false },
    { step: "8", main: false },
    { step: "10", main: false },
];

const size = (step: string) => `calc(var(--spacing) * ${step})`;
const px = (step: string) => `${Number(step) * 4}px`;

function Legend({ step, main, prefix }: { step: string; main: boolean; prefix: string }) {
    return (
        <div className="flex w-44 shrink-0 items-baseline gap-2 text-xs">
            <code className="font-mono text-white/85">{prefix}-{step}</code>
            <span className="text-white/45">{px(step)}</span>
            {main ? <span className="rounded-full bg-emerald-400/15 px-1.5 text-[10px] text-emerald-200">principal</span> : null}
        </div>
    );
}

export const Padding: Story = {
    render: () => (
        <div>
            <h2 className="text-lg font-semibold">Padding</h2>
            <p className="mt-1 text-sm text-white/55">Espaço interno: <code>p-*</code>, <code>px-*</code>, <code>py-*</code>. A área colorida é o padding.</p>
            <div className="mt-5 space-y-3">
                {STEPS.map(({ step, main }) => (
                    <div key={step} className="flex items-center gap-4">
                        <Legend step={step} main={main} prefix="p" />
                        <div className="rounded-lg bg-emerald-400/25" style={{ padding: size(step) }}>
                            <div className="rounded-md bg-surface px-3 py-1 text-xs text-white/80">Conteúdo</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    ),
};

export const Gap: Story = {
    render: () => (
        <div>
            <h2 className="text-lg font-semibold">Gap</h2>
            <p className="mt-1 text-sm text-white/55">Espaço entre filhos em flex/grid: <code>gap-*</code>. Prefira gap a margem entre irmãos.</p>
            <div className="mt-5 space-y-3">
                {STEPS.map(({ step, main }) => (
                    <div key={step} className="flex items-center gap-4">
                        <Legend step={step} main={main} prefix="gap" />
                        <div className="flex" style={{ gap: size(step) }}>
                            {[1, 2, 3, 4].map((n) => (
                                <div key={n} className="h-8 w-8 rounded-md bg-emerald-400/35" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    ),
};

export const Margem: Story = {
    render: () => (
        <div>
            <h2 className="text-lg font-semibold">Margem</h2>
            <p className="mt-1 text-sm text-white/55">Espaço externo: <code>mt-*</code>, <code>mb-*</code>, <code>mx-*</code>. Usada para separar blocos (título → conteúdo), geralmente <code>mt-1</code>–<code>mt-5</code>.</p>
            <div className="mt-5 space-y-3">
                {STEPS.map(({ step, main }) => (
                    <div key={step} className="flex items-start gap-4">
                        <Legend step={step} main={main} prefix="mt" />
                        <div>
                            <div className="h-6 w-40 rounded-md bg-white/20" />
                            <div className="w-40 rounded-md bg-emerald-400/25" style={{ height: size(step) }} />
                            <div className="h-6 w-40 rounded-md bg-white/20" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    ),
};
