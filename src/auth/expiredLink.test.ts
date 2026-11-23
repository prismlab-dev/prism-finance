import { describe, expect, it } from "vitest";
import { isExpiredAuthLink } from "./expiredLink";

describe("isExpiredAuthLink", () => {
    it("reconhece o link vencido ou usado no hash e na query", () => {
        expect(isExpiredAuthLink("https://app.test/#error=access_denied&error_code=otp_expired&error_description=x")).toBe(true);
        expect(isExpiredAuthLink("https://app.test/?error_code=otp_expired")).toBe(true);
    });

    it("ignora links válidos e outros erros", () => {
        expect(isExpiredAuthLink("https://app.test/home")).toBe(false);
        expect(isExpiredAuthLink("https://app.test/#access_token=x&type=recovery")).toBe(false);
        expect(isExpiredAuthLink("https://app.test/configuracoes#error_code=identity_already_exists")).toBe(false);
    });
});
