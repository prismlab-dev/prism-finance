import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
    title: "Tokens/Sombras e breakpoints",
    parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const SHADOWS = [
    { name: "Modal / painel", value: "0_26px_70px_-38px_rgba(0,0,0,0.95)", css: "0 26px 70px -38px rgba(0,0,0,0.95)" },
    { name: "Cartão elevado", value: "0_24px_60px_-32px_rgba(0,0,0,0.9)", css: "0 24px 60px -32px rgba(0,0,0,0.9)" },
    { name: "Popover", value: "0_24px_60px_-30px_rgba(0,0,0,0.95)", css: "0 24px 60px -30px rgba(0,0,0,0.95)" },
    { name: "Brilho interno", value: "inset_0_1px_0_white/6%", css: "inset 0 1px 0 color-mix(in oklab, var(--color-white) 6%, transparent)" },
];

export const Sombras: Story = {
    render: () => (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {SHADOWS.map(({ name, value, css }) => (
                <div key={name}>
                    <div className="h-24 rounded-xl border border-white/[0.09] bg-surface" style={{ boxShadow: css }} />
                    <p className="mt-3 text-sm font-medium">{name}</p>
                    <code className="font-mono text-[11px] text-white/45">shadow-[{value}]</code>
                </div>
            ))}
        </div>
    ),
};

const BREAKPOINTS = [
    { name: "sm", width: "40rem (640px)", note: "padrão Tailwind" },
    { name: "md", width: "48rem (768px)", note: "padrão Tailwind" },
    { name: "lg", width: "64rem (1024px)", note: "padrão Tailwind" },
    { name: "laptop", width: "1200px", note: "do projeto" },
    { name: "desktop", width: "1600px", note: "do projeto" },
];

export const Breakpoints: Story = {
    render: () => (
        <div className="max-w-xl divide-y divide-white/[0.08] rounded-xl border border-white/[0.09]">
            {BREAKPOINTS.map(({ name, width, note }) => (
                <div key={name} className="flex items-center gap-4 px-4 py-3 text-sm">
                    <code className="w-20 font-mono text-white/85">{name}:</code>
                    <span className="flex-1">{width}</span>
                    <span className="text-xs text-white/45">{note}</span>
                </div>
            ))}
        </div>
    ),
};
