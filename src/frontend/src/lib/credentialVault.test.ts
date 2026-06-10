import {
  decryptCredentialVault,
  encryptCredentialVault,
} from "@/lib/credentialVault";
import { describe, expect, it } from "vitest";

describe("credential vault", () => {
  const payload = {
    priceProvider: "twelveData" as const,
    apiKey: "price-secret",
    finnhubKey: "fundamental-secret",
    aiKey: "ai-secret",
  };

  it("round-trips provider keys through client-side encryption", async () => {
    const encrypted = await encryptCredentialVault(
      payload,
      "a sufficiently long passphrase",
    );
    expect(encrypted).not.toContain("price-secret");
    await expect(
      decryptCredentialVault(encrypted, "a sufficiently long passphrase"),
    ).resolves.toEqual(payload);
  });

  it("rejects the wrong passphrase", async () => {
    const encrypted = await encryptCredentialVault(
      payload,
      "a sufficiently long passphrase",
    );
    await expect(
      decryptCredentialVault(encrypted, "the wrong passphrase"),
    ).rejects.toThrow("Could not unlock vault");
  });
});
