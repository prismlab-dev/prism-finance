import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check, X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { IconButton } from "../../components/ui/IconButton";
import { THEMES } from "../../lib/appearance";

const meta = {
    title: "Tokens/Temas",
    parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const SWATCHES = ["canvas", "surface", "raised"] as const;
const TONES = ["emerald", "red", "amber", "sky"] as const;

// O data-theme no wrapper faz as variáveis do tema valerem só ali dentro (mesmo truque do AppearancePreview do app).
function ThemeCard({ id, label }: { id: string; label: string }) {
    return (
        <section data-theme={id} className="rounded-2xl border border-white/[0.12] bg-canvas p-4 text-white">
            <header className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">{label}</h2>
                <code className="font-mono text-[11px] text-white/45">data-theme="{id}"</code>
            </header>

            <div className="mt-3 grid grid-cols-3 gap-2">
                {SWATCHES.map((token) => (
                    <div key={token}>
                        <div className="h-10 rounded-lg border border-white/[0.12]" style={{ background: `var(--color-${token})` }} />
                        <p className="mt-1 text-[11px] text-white/55">{token}</p>
                    </div>
                ))}
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
                {TONES.map((tone) => (
                    <div key={tone} title={tone} className="flex h-6 overflow-hidden rounded-md">
                        {[300, 400, 500, 600].map((step) => (
                            <div key={step} className="flex-1" style={{ background: `var(--color-${tone}-${step})` }} />
                        ))}
                    </div>
                ))}
            </div>

            <div className="mt-3 rounded-xl border border-white/[0.09] bg-surface p-3">
                <p className="text-sm text-white">Saldo do mês</p>
                <p className="text-xs text-white/55">R$ 12.480,90 disponíveis</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Button variant="secondary">Cancelar</Button>
                    <Button variant="success"><Check size={14} /> Salvar</Button>
                    <Button variant="danger">Excluir</Button>
                    <Button variant="solid">Continuar</Button>
                    <IconButton aria-label="Fechar"><X size={15} /></IconButton>
                </div>
            </div>
        </section>
    );
}

export const TodosOsTemas: Story = {
    name: "Todos os temas",
    render: () => (
        <div>
            <p className="mb-4 text-sm text-white/55">
                Os {THEMES.length} temas do app, vindos de <code>src/lib/appearance.ts</code> e <code>src/styles/themes.css</code>. Para ver qualquer story em um tema, use o seletor <b>Tema</b> na barra.
            </p>
            <div className="grid grid-cols-1 gap-4 laptop:grid-cols-2">
                {THEMES.map((theme) => (
                    <ThemeCard key={theme.id} id={theme.id} label={theme.label} />
                ))}
            </div>
        </div>
    ),
};
