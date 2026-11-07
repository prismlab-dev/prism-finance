import { useLocalPreferenceSection } from "./localPreferences";

// Disposição dos widgets da Home: 3 colunas ordenadas + os ocultos. Vale só para este dispositivo.

export const HOME_WIDGETS = [
    { id: "upcoming", label: "Próximos lançamentos" },
    { id: "recent", label: "Transações recentes" },
    { id: "spending", label: "Gastos por categoria" },
    { id: "invoices", label: "Faturas de cartão" },
    { id: "wealth", label: "Patrimônio" },
    { id: "alerts", label: "Alertas de gastos e contas" },
    { id: "balance", label: "Balanço mensal" },
] as const;

export type HomeWidgetId = (typeof HOME_WIDGETS)[number]["id"];
export type HomeLayout = { columns: [HomeWidgetId[], HomeWidgetId[], HomeWidgetId[]]; hidden: HomeWidgetId[] };

export const DEFAULT_HOME_LAYOUT: HomeLayout = {
    columns: [["upcoming", "recent"], ["spending", "invoices"], ["wealth", "alerts", "balance"]],
    hidden: [],
};

const WIDGET_IDS = new Set<string>(HOME_WIDGETS.map((widget) => widget.id));

/** Descarta ids desconhecidos/duplicados e devolve widgets novos (ausentes do salvo) à coluna padrão. */
export function normalizeHomeLayout(value: unknown): HomeLayout {
    const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
    const seen = new Set<string>();
    const clean = (list: unknown): HomeWidgetId[] =>
        (Array.isArray(list) ? list : []).filter((id): id is HomeWidgetId => {
            if (typeof id !== "string" || !WIDGET_IDS.has(id) || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    const rawColumns = Array.isArray(raw.columns) ? raw.columns : [];
    const columns: HomeLayout["columns"] = [clean(rawColumns[0]), clean(rawColumns[1]), clean(rawColumns[2])];
    const hidden = clean(raw.hidden);
    DEFAULT_HOME_LAYOUT.columns.forEach((defaults, index) => {
        defaults.forEach((id) => !seen.has(id) && columns[index].push(id));
    });
    return { columns, hidden };
}

export function useHomeLayout() {
    return useLocalPreferenceSection<HomeLayout>(null, "home-layout", DEFAULT_HOME_LAYOUT, normalizeHomeLayout);
}
