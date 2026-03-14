import { describe, expect, it } from "vitest";
import { hashPassword as hashLegacyPassword } from "better-auth/crypto";
import { hashPassword, verifyPassword } from "../password.js";

describe("password helpers", () => {
  it("hashes and verifies passwords with the custom scrypt format", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(hash.startsWith("custom-scrypt$")).toBe(true);
    await expect(
      verifyPassword({
        hash,
        password: "correct horse battery staple",
      }),
    ).resolves.toBe(true);
    await expect(
      verifyPassword({
        hash,
        password: "wrong password",
      }),
    ).resolves.toBe(false);
  });

  it("still verifies legacy better-auth password hashes", async () => {
    const legacyHash = await hashLegacyPassword("secret");

    await expect(
      verifyPassword({
        hash: legacyHash,
        password: "secret",
      }),
    ).resolves.toBe(true);
  });

  it("derives the same scrypt key as better-auth for the same password and salt", async () => {
    const password = "correct horse battery staple";
    const legacyHash = await hashLegacyPassword(password);
    const [saltHex, derivedKeyHex] = legacyHash.split(":");

    expect(saltHex).toBeTruthy();
    expect(derivedKeyHex).toBeTruthy();

    const customHash = [
      "custom-scrypt",
      "16384",
      "16",
      "1",
      "64",
      saltHex,
      derivedKeyHex,
    ].join("$");

    await expect(
      verifyPassword({
        hash: customHash,
        password,
      }),
    ).resolves.toBe(true);
  });
});
