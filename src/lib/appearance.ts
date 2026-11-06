import { useSyncExternalStore } from "react";

// Aparência local do dispositivo: layout (estrutura da interface) e tema (cores).
// Aplicados como data-layout / data-theme no <html>; o CSS de cada um se pendura nesses atributos.

export const LAYOUTS = [
    { id: "classic", label: "Clássico", available: true },
    { id: "lumen", label: "Lumen", available: true },
] as const;

export const THEMES = [
    // As cores de cada tema ficam em scripts/generate-themes.mjs (gera src/styles/themes.css).
    { id: "dark", label: "Escuro", available: true },
    { id: "lead", label: "Chumbo", available: true },
    { id: "graphite", label: "Grafite", available: true },
    { id: "light", label: "Claro", available: true },
    { id: "silver", label: "Prata", available: true },
    { id: "mist", label: "Névoa", available: true },
] as const;

export type LayoutId = (typeof LAYOUTS)[number]["id"];
export type ThemeId = (typeof THEMES)[number]["id"];
export type Appearance = { layout: LayoutId; theme: ThemeId };

const STORAGE_KEY = "prism.appearance";
const DEFAULT_APPEARANCE: Appearance = { layout: "classic", theme: "dark" };

function pick<T extends { id: string; available: boolean }>(options: readonly T[], value: unknown, fallback: T["id"]): T["id"] {
    return options.find((option) => option.available && option.id === value)?.id ?? fallback;
}

export function getAppearance(): Appearance {
    try {
        const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
        const value = typeof stored === "object" && stored !== null ? (stored as Record<string, unknown>) : {};
        return {
            layout: pick(LAYOUTS, value.layout, DEFAULT_APPEARANCE.layout),
            theme: pick(THEMES, value.theme, DEFAULT_APPEARANCE.theme),
        };
    } catch {
        return DEFAULT_APPEARANCE;
    }
}

let current: Appearance = DEFAULT_APPEARANCE;
const listeners = new Set<() => void>();

function apply(appearance: Appearance) {
    const { layout, theme } = appearance;
    current = appearance;
    listeners.forEach((listener) => listener());
    document.documentElement.dataset.layout = layout;
    document.documentElement.dataset.theme = theme;
}

export function setAppearance(appearance: Appearance) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
    } catch {
        // Sem storage a escolha vale só para esta aba.
    }
    apply(appearance);
}

export function initAppearance() {
    apply(getAppearance());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Aparência ativa, re-renderizando quando o usuário troca layout ou tema. */
export function useAppearance(): Appearance {
    return useSyncExternalStore(subscribe, () => current);
}
