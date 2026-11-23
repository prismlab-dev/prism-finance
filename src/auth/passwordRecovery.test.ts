import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { finishPasswordRecovery, isPasswordRecoveryPending, readRecoveryToken, startPasswordRecovery } from "./passwordRecovery";

describe("link de redefinição", () => {
    const link = "https://app.test/#access_token=token-1&refresh_token=r&type=recovery";

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("lê o token só de links de redefinição", () => {
        expect(readRecoveryToken(link)).toBe("token-1");
        expect(readRecoveryToken("https://app.test/#access_token=token-1&type=signup")).toBeNull();
        expect(readRecoveryToken("https://app.test/home")).toBeNull();
    });

    it("bloqueia com a sessão do link, sem o evento, e não volta a bloquear depois da troca", async () => {
        const items = new Map<string, string>();
        vi.stubGlobal("window", {
            location: { href: link },
            localStorage: {
                getItem: (key: string) => items.get(key) ?? null,
                setItem: (key: string, value: string) => items.set(key, value),
                removeItem: (key: string) => items.delete(key),
            },
        });
        vi.resetModules();
        const recovery = await import("./passwordRecovery");
        recovery.detectPasswordRecovery({ access_token: "outra", user: { id: "user-2" } });
        expect(recovery.isPasswordRecoveryPending("user-2")).toBe(false);
        recovery.detectPasswordRecovery({ access_token: "token-1", user: { id: "user-1" } });
        expect(recovery.isPasswordRecoveryPending("user-1")).toBe(true);
        recovery.finishPasswordRecovery();
        recovery.detectPasswordRecovery({ access_token: "token-1", user: { id: "user-1" } });
        expect(recovery.isPasswordRecoveryPending("user-1")).toBe(false);
    });
});

describe("password recovery", () => {
    beforeEach(() => {
        const items = new Map<string, string>();
        vi.stubGlobal("window", {
            localStorage: {
                getItem: (key: string) => items.get(key) ?? null,
                setItem: (key: string, value: string) => items.set(key, value),
                removeItem: (key: string) => items.delete(key),
            },
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    it("bloqueia só a conta que abriu o link, até concluir", () => {
        expect(isPasswordRecoveryPending("user-1")).toBe(false);
        startPasswordRecovery("user-1");
        expect(isPasswordRecoveryPending("user-1")).toBe(true);
        expect(isPasswordRecoveryPending("user-2")).toBe(false);
        expect(isPasswordRecoveryPending(undefined)).toBe(false);
        finishPasswordRecovery();
        expect(isPasswordRecoveryPending("user-1")).toBe(false);
    });
});
