import type { PriceProvider } from "@/lib/liveStore";

export interface CredentialPayload {
  priceProvider: PriceProvider;
  priceKeys: Record<PriceProvider, string>;
  finnhubKey: string;
  aiKey: string;
}

interface EncryptedVault {
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
}

const ITERATIONS = 250_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

function isCredentialPayload(value: unknown): value is CredentialPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    (payload.priceProvider === "alphaVantage" ||
      payload.priceProvider === "twelveData") &&
    !!payload.priceKeys &&
    typeof payload.priceKeys === "object" &&
    typeof (payload.priceKeys as Record<string, unknown>).alphaVantage ===
      "string" &&
    typeof (payload.priceKeys as Record<string, unknown>).twelveData ===
      "string" &&
    typeof payload.finnhubKey === "string" &&
    typeof payload.aiKey === "string"
  );
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asArrayBuffer(salt),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptCredentialVault(
  payload: CredentialPayload,
  passphrase: string,
): Promise<string> {
  if (passphrase.length < 12) {
    throw new Error("Use a vault passphrase of at least 12 characters.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  );
  const vault: EncryptedVault = {
    version: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
  return JSON.stringify(vault);
}

export async function decryptCredentialVault(
  serialized: string,
  passphrase: string,
): Promise<CredentialPayload> {
  const vault = JSON.parse(serialized) as EncryptedVault;
  if (vault.version !== 1) throw new Error("Unsupported vault version.");
  try {
    const salt = fromBase64(vault.salt);
    const iv = fromBase64(vault.iv);
    const key = await deriveKey(passphrase, salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: asArrayBuffer(iv) },
      key,
      asArrayBuffer(fromBase64(vault.ciphertext)),
    );
    const payload = JSON.parse(decoder.decode(plaintext)) as
      | CredentialPayload
      | {
          priceProvider: PriceProvider;
          apiKey: string;
          finnhubKey: string;
          aiKey: string;
        };
    if (isCredentialPayload(payload)) return payload;
    if (
      payload &&
      typeof payload === "object" &&
      (payload.priceProvider === "alphaVantage" ||
        payload.priceProvider === "twelveData") &&
      typeof payload.apiKey === "string" &&
      typeof payload.finnhubKey === "string" &&
      typeof payload.aiKey === "string"
    ) {
      return {
        priceProvider: payload.priceProvider,
        priceKeys: {
          alphaVantage:
            payload.priceProvider === "alphaVantage" ? payload.apiKey : "",
          twelveData:
            payload.priceProvider === "twelveData" ? payload.apiKey : "",
        },
        finnhubKey: payload.finnhubKey,
        aiKey: payload.aiKey,
      };
    }
    throw new Error("Invalid vault payload.");
  } catch {
    throw new Error("Could not unlock vault. Check the passphrase.");
  }
}
