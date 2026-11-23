// Guarda as últimas ações da aba para o relato de bugs. Valores digitados e query strings nunca são registrados.

const STORAGE_KEY = "prism.user-actions";
const MAX_ACTIONS = 50;
const MAX_DETAIL_LENGTH = 120;
const INTERACTIVE_SELECTOR =
    "button, a, input, select, textarea, label, summary, [role='button'], [role='option'], [role='menuitem'], [role='tab'], [role='switch'], [role='checkbox']";
const VALUE_FIELD_SELECTOR = "input, select, textarea";

export interface UserAction {
    at: string;
    path: string;
    type: "click" | "change" | "submit" | "key" | "navigation" | "finance" | "error";
    detail: string;
}

function readStoredActions(): UserAction[] {
    try {
        const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

let actions = readStoredActions();
let isListening = false;

function persistActions() {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
    } catch {
        // Sem storage o histórico vale só até recarregar a página.
    }
}

export function recordUserAction(type: UserAction["type"], detail: string) {
    const path = typeof location === "undefined" ? "" : location.pathname;
    const shortDetail = detail.replace(/\s+/g, " ").trim().slice(0, MAX_DETAIL_LENGTH);
    actions = [...actions, { at: new Date().toISOString(), path, type, detail: shortDetail }].slice(-MAX_ACTIONS);
    persistActions();
}

export function getRecentUserActions(): UserAction[] {
    return actions;
}

export function clearUserActions() {
    actions = [];
    persistActions();
}

function describeError(error: unknown): string {
    return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function describeElement(element: Element): string {
    const isValueField = element.matches(VALUE_FIELD_SELECTOR);
    const name =
        element.getAttribute("aria-label") ||
        element.getAttribute("title") ||
        (isValueField ? element.getAttribute("name") || element.id || element.getAttribute("placeholder") : element.textContent);
    return `${element.tagName.toLowerCase()} ${name ?? ""}`;
}

function recordElementAction(type: UserAction["type"], event: Event) {
    const element = event.target instanceof Element ? event.target.closest(INTERACTIVE_SELECTOR) : null;
    if (element) recordUserAction(type, describeElement(element));
}

/** Envolve as ações financeiras para registrar nome e falhas, sem os argumentos. */
export function withActionLog<T extends object>(target: T): T {
    const entries = Object.entries(target).map(([name, action]) => {
        if (typeof action !== "function") return [name, action];
        return [
            name,
            (...args: unknown[]) => {
                const recordFailure = (error: unknown) => recordUserAction("error", `${name} falhou: ${describeError(error)}`);
                recordUserAction("finance", name);
                try {
                    const result: unknown = action(...args);
                    if (result instanceof Promise) result.catch(recordFailure);
                    return result;
                } catch (error) {
                    recordFailure(error);
                    throw error;
                }
            },
        ];
    });
    return Object.fromEntries(entries) as T;
}

export function initUserActionLog() {
    if (isListening) return;
    isListening = true;

    document.addEventListener("click", (event) => recordElementAction("click", event), true);
    document.addEventListener("change", (event) => recordElementAction("change", event), true);
    document.addEventListener("submit", () => recordUserAction("submit", "form"), true);
    document.addEventListener(
        "keydown",
        (event) => {
            if (event.key === "Enter" || event.key === "Escape") recordUserAction("key", event.key);
        },
        true,
    );
    window.addEventListener("popstate", () => recordUserAction("navigation", "voltar/avançar"));
    window.addEventListener("error", (event) => recordUserAction("error", event.message));
    window.addEventListener("unhandledrejection", (event) => recordUserAction("error", describeError(event.reason)));
}
