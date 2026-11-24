import { cleanup, render } from "@testing-library/react";
import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as previewAnnotations from "../../.storybook/preview";

// Renderiza cada story do Storybook e falha se alguma lançar erro. Rodar com `npm run test:stories`.
const modules = import.meta.glob("../**/*.stories.tsx", { eager: true }) as Record<string, Record<string, unknown>>;

// Precisa rodar antes do composeStories (que acontece na coleta dos testes), não em beforeAll.
setProjectAnnotations((previewAnnotations as { default: never }).default);

beforeAll(() => {
    // Chart.js/canvas e media queries não existem no happy-dom.
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
    window.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
    window.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } root = null; rootMargin = ""; thresholds = []; } as never;
    window.HTMLElement.prototype.scrollIntoView ??= () => undefined;
});

afterEach(cleanup);

describe.each(Object.entries(modules))("%s", (path, mod) => {
    const stories = composeStories(mod as never) as Record<string, React.ComponentType>;
    it.each(Object.keys(stories))("%s renderiza", async (name) => {
        const Story = stories[name];
        expect(() => render(<Story />)).not.toThrow();
        await Promise.resolve();
    });
    it("tem pelo menos uma story", () => expect(Object.keys(stories).length).toBeGreaterThan(0));
    void path;
});
