import type { PaymentProvider } from "./index";
import { mockPaymentProvider } from "./mock-provider";

let albyInstance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.LIGHTNING_PROVIDER ?? "mock";
  if (provider === "alby") {
    if (!albyInstance) {
      // Dynamic require to avoid loading @getalby/sdk when not needed
      const { AlbyPaymentProvider } = require("./alby-provider") as typeof import("./alby-provider");
      albyInstance = new AlbyPaymentProvider();
    }
    return albyInstance;
  }
  return mockPaymentProvider;
}

export function getProviderName(): string {
  return process.env.LIGHTNING_PROVIDER ?? "mock";
}
