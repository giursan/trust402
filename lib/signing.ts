import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

// noble/ed25519 v3 requires wiring SHA-512 for sync operations
ed.hashes.sha512 = sha512;

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function canonicalize(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj)
    .sort()
    .reduce((acc, k) => ({ ...acc, [k]: obj[k] }), {} as Record<string, unknown>);
  return JSON.stringify(sorted);
}

export function signProof(proofData: Record<string, unknown>): { signature: string; publicKey: string } {
  const privKeyHex = process.env.TRUST402_SIGNING_PRIVATE_KEY!;
  const pubKeyHex = process.env.TRUST402_SIGNING_PUBLIC_KEY!;

  const message = new TextEncoder().encode(canonicalize(proofData));
  const privKey = hexToBytes(privKeyHex.padStart(64, "0").slice(0, 64));
  const sig = ed.sign(message, privKey);

  return {
    signature: bytesToHex(sig),
    publicKey: pubKeyHex,
  };
}

export function getPublicKey(): string {
  return process.env.TRUST402_SIGNING_PUBLIC_KEY!;
}
