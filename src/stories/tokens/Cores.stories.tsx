import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";

const meta = {
    title: "Tokens/Cores",
    parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
    return (
        <section className="mb-10">
            <h2 className="text-lg font-semibold">{title}</h2>
            {hint ? <p className="mt-1 text-sm text-white/55">{hint}</p> : null}
            <div className="mt-4">{children}</div>
        </section>
    );
}

function Swatch({ label, detail, style }: { label: string; detail?: string; style: CSSProperties }) {
    return (
        <div className="min-w-0">
            <div className="h-14 rounded-xl border border-white/[0.12]" style={style} />
            <p className="mt-2 truncate text-xs font-medium text-white/85">{label}</p>
            {detail ? <p className="truncate font-mono text-[11px] text-white/45">{detail}</p> : null}
        </div>
    );
}

const GRID = "grid grid-cols-2 gap-4 sm:grid-cols-4 laptop:grid-cols-6";

const SURFACES = [
    { token: "canvas", use: "Fundo da página" },
    { token: "surface", use: "Painéis e modais" },
    { token: "raised", use: "Cartões sobre o painel" },
];

const SCALE = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const TONES = [
    { family: "emerald", meaning: "Positivo, receita, confirmar" },
    { family: "red", meaning: "Negativo, despesa, excluir" },
    { family: "amber", meaning: "Atenção, previsto" },
    { family: "sky", meaning: "Informação, foco" },
];

const OTHER_FAMILIES = ["orange", "yellow", "lime", "green", "teal", "cyan", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose", "slate", "gray", "zinc", "neutral", "stone"];

const TEXT_LEVELS = [100, 85, 70, 60, 45, 35];
const LINE_LEVELS = [0.06, 0.09, 0.12, 0.2, 0.3];

const white = (alpha: number) => `color-mix(in oklab, var(--color-white) ${alpha * 100}%, transparent)`;

export const Superficies: Story = {
    name: "Superfícies",
    render: () => (
        <Section title="Superfícies" hint="Variam por tema (themes.css). Use sempre pelo nome, nunca pelo hexadecimal.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {SURFACES.map(({ token, use }) => (
                    <Swatch key={token} label={`${use}`} detail={`bg-${token}  ·  --color-${token}`} style={{ background: `var(--color-${token})` }} />
                ))}
            </div>
        </Section>
    ),
};

export const TextoEBordas: Story = {
    name: "Texto e bordas",
    render: () => (
        <>
            <Section title="Texto" hint="O app escreve em branco com opacidade (text-white/70). A hierarquia vem da opacidade.">
                <div className="space-y-2">
                    {TEXT_LEVELS.map((level) => (
                        <p key={level} className="text-sm" style={{ color: white(level / 100) }}>
                            text-white{level === 100 ? "" : `/${level}`} <span className="text-white/35">— Saldo disponível em conta</span>
                        </p>
                    ))}
                </div>
            </Section>
            <Section title="Bordas e fundos translúcidos" hint="border-white/[0.12] é a borda padrão de botões e campos; bg-white/[0.03] é o fundo padrão.">
                <div className={GRID}>
                    {LINE_LEVELS.map((alpha) => (
                        <Swatch key={alpha} label={`white/[${alpha}]`} detail="borda ou fundo" style={{ background: white(alpha / 3) , borderColor: white(alpha) }} />
                    ))}
                </div>
            </Section>
        </>
    ),
};

export const Semanticas: Story = {
    name: "Semânticas",
    render: () => (
        <Section title="Cores com significado" hint="Verde = entrada/confirmação, vermelho = saída/destrutivo, âmbar = atenção, azul-céu = informação.">
            <div className="space-y-6">
                {TONES.map(({ family, meaning }) => (
                    <div key={family}>
                        <p className="mb-2 text-sm font-medium">
                            {family} <span className="font-normal text-white/50">— {meaning}</span>
                        </p>
                        <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
                            {SCALE.map((step) => (
                                <Swatch key={step} label={String(step)} style={{ background: `var(--color-${family}-${step})` }} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </Section>
    ),
};

export const PaletaCompleta: Story = {
    name: "Paleta completa",
    render: () => (
        <Section title="Demais famílias" hint="Usadas em categorias, carteiras e gráficos. Cada tema remapeia a escala inteira.">
            <div className="space-y-4">
                {OTHER_FAMILIES.map((family) => (
                    <div key={family} className="grid grid-cols-[5rem_1fr] items-center gap-3">
                        <span className="text-xs text-white/65">{family}</span>
                        <div className="grid grid-cols-11 gap-1">
                            {SCALE.map((step) => (
                                <div key={step} title={`${family}-${step}`} className="h-8 rounded-md" style={{ background: `var(--color-${family}-${step})` }} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </Section>
    ),
};
