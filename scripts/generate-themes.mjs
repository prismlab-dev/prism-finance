// Gera src/styles/themes.css a partir das cores do Tailwind.
// Os utilitários do Tailwind v4 leem var(--color-*), então cada tema só redefine variáveis.
// Rodar: node scripts/generate-themes.mjs
import { readFileSync, writeFileSync } from "node:fs";

const tailwindTheme = readFileSync(new URL("../node_modules/tailwindcss/theme.css", import.meta.url), "utf8");
const scales = {};
for (const [, hue, step, value] of tailwindTheme.matchAll(/--color-([a-z]+)-(\d+):\s*([^;]+);/g)) {
    (scales[hue] ??= {})[step] = value.trim();
}

// Tokens próprios do app (os mesmos de @theme em index.css): fundo da página, cards e popovers.
const DARK_TOKENS = { white: "#fff", canvas: "#0e0e10", surface: "#111111", raised: "#161618" };

// Claro: inverte cada escala (300 ↔ 700, 950 ↔ 50…) para que as classes pensadas para o escuro continuem legíveis.
function invertedScales() {
    const result = {};
    for (const [hue, steps] of Object.entries(scales)) {
        const keys = Object.keys(steps).sort((a, b) => Number(a) - Number(b));
        keys.forEach((step, index) => {
            result[`${hue}-${step}`] = steps[keys[keys.length - 1 - index]];
        });
    }
    return result;
}

const THEMES = {
    light: {
        scheme: "light",
        vars: { ...invertedScales(), white: "#16181d", canvas: "#f3f4f6", surface: "#ffffff", raised: "#ffffff" },
    },
    // Chumbo: meio-termo entre o Escuro e o Grafite.
    lead: {
        scheme: "dark",
        vars: {
            white: "#f5f5f6",
            canvas: "#17171a",
            surface: "#1c1d20",
            raised: "#232427",
            "zinc-950": "#111113",
            "neutral-950": "#121214",
            "neutral-900": "#212225",
            "neutral-800": "#2e2f32",
        },
    },
    // Grafite: o escuro levado para o cinza; superfícies mais claras e neutras, sem matiz.
    graphite: {
        scheme: "dark",
        vars: {
            white: "#f2f2f3",
            canvas: "#202124",
            surface: "#27282c",
            raised: "#2f3035",
            "zinc-950": "#18191b",
            "neutral-950": "#1a1b1e",
            "neutral-900": "#2b2c30",
            "neutral-800": "#37383d",
        },
    },
    // Prata: claro neutro, um degrau abaixo do Claro (menos branco, sem matiz).
    silver: {
        scheme: "light",
        vars: { ...invertedScales(), white: "#1a1b1f", canvas: "#dcdde0", surface: "#e9eaec", raised: "#f2f3f4", "zinc-950": "#cfd0d4", "neutral-950": "#e4e5e7" },
    },
    // Névoa: claro frio, cinza-azulado com texto azul-ardósia.
    mist: {
        scheme: "light",
        vars: { ...invertedScales(), white: "#1c2433", canvas: "#e8ecf2", surface: "#f6f8fb", raised: "#ffffff", "zinc-950": "#dde3ec", "neutral-950": "#f1f4f8" },
    },
};

// Faixa de luminosidade (oklch) em que cores do usuário ficam legíveis sobre o fundo do tema; ver lib/colorContrast.ts.
const TINT_RANGE = { dark: [0.72, 1], light: [0, 0.52] };

function block(selector, scheme, vars) {
    const lines = Object.entries(vars).map(([name, value]) => `    --color-${name}: ${value};`);
    const [tintMin, tintMax] = TINT_RANGE[scheme];
    lines.push(`    --tint-l-min: ${tintMin};`, `    --tint-l-max: ${tintMax};`);
    return `${selector} {\n    color-scheme: ${scheme};\n${lines.join("\n")}\n}\n`;
}

// Todo elemento com data-theme volta às cores originais antes de aplicar o seu tema,
// para um preview "escuro" dentro do app claro (e vice-versa) não herdar as variáveis de fora.
const touched = new Set(Object.values(THEMES).flatMap((theme) => Object.keys(theme.vars)));
const originals = Object.fromEntries(
    [...touched].map((name) => {
        const [hue, step] = name.split("-");
        return [name, DARK_TOKENS[name] ?? scales[hue][step]];
    }),
);

const css = [
    "/* Gerado por scripts/generate-themes.mjs. Edite o script, não este arquivo. */\n",
    block("[data-theme]", "dark", originals),
    ...Object.entries(THEMES).map(([id, theme]) => block(`[data-theme="${id}"]`, theme.scheme, theme.vars)),
].join("\n");

writeFileSync(new URL("../src/styles/themes.css", import.meta.url), css);
console.log(`themes.css: ${touched.size} variáveis, ${Object.keys(THEMES).length} temas`);
