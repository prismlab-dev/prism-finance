import { describe, expect, it } from "vitest";
import { fixtureWallet } from "./financeTestFixtures";
import { normalizeFinanceSnapshot } from "./financeCore";
import { ensureWalletId } from "./helpers";

describe("removable default wallet", () => {
    it("is created only for a user without wallets", () => {
        expect(normalizeFinanceSnapshot(null).snapshot.wallets.map((wallet) => wallet.id)).toEqual(["default"]);
        expect(normalizeFinanceSnapshot({ wallets: [fixtureWallet] }).snapshot.wallets.map((wallet) => wallet.id)).toEqual([fixtureWallet.id]);
    });

    it("never falls back to a wallet that no longer exists", () => {
        expect(ensureWalletId("default", [{ ...fixtureWallet, id: "archived", isActive: false }, fixtureWallet])).toBe(fixtureWallet.id);
    });
});
