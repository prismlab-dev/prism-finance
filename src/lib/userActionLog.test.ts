import { beforeEach, describe, expect, it } from "vitest";
import { clearUserActions, getRecentUserActions, recordUserAction, withActionLog } from "./userActionLog";

describe("userActionLog", () => {
    beforeEach(clearUserActions);

    it("mantém só as 50 ações mais recentes", () => {
        for (let index = 0; index < 60; index += 1) recordUserAction("click", `ação ${index}`);

        const actions = getRecentUserActions();
        expect(actions).toHaveLength(50);
        expect(actions[0].detail).toBe("ação 10");
        expect(actions[49].detail).toBe("ação 59");
    });

    it("registra ações financeiras sem argumentos e preserva o resultado e a falha", async () => {
        const logged = withActionLog({
            save: async (value: string) => value,
            fail: async () => {
                throw new Error("sem saldo");
            },
        });

        await expect(logged.save("segredo")).resolves.toBe("segredo");
        await expect(logged.fail()).rejects.toThrow("sem saldo");
        expect(getRecentUserActions().map(({ detail }) => detail)).toEqual(["save", "fail", "fail falhou: Error: sem saldo"]);
    });
});
