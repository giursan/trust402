import type { PaymentProvider } from "./index";

export class AlbyPaymentProvider implements PaymentProvider {
  private nwcClient: InstanceType<typeof import("@getalby/sdk").NWCClient> | null = null;
  private initialized = false;

  private async init() {
    if (this.initialized) return;
    const { NWCClient } = await import("@getalby/sdk");
    this.nwcClient = new NWCClient({
      nostrWalletConnectUrl: process.env.ALBY_NWC_CONNECTION_SECRET!,
    });
    this.initialized = true;
  }

  async createInvoice({ amountSats, memo }: { amountSats: number; memo: string }) {
    try {
      await this.init();
      const result = await this.nwcClient!.makeInvoice({
        amount: amountSats * 1000, // NWC uses millisats
        description: memo,
        expiry: 600,
      });
      return {
        invoice: result.invoice,
        paymentHash: result.payment_hash,
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      };
    } catch {
      return {
        invoice: `alby_unavailable_${Date.now()}`,
        paymentHash: `alby_unavailable_${Date.now()}`,
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      };
    }
  }

  async checkInvoice(paymentHash: string): Promise<{ settled: boolean; receipt?: string }> {
    try {
      await this.init();
      const result = await this.nwcClient!.lookupInvoice({ payment_hash: paymentHash });
      return {
        settled: result.settled_at != null,
        receipt: result.preimage ?? undefined,
      };
    } catch {
      return { settled: false };
    }
  }

  async payInvoice(invoice: string): Promise<{ paid: boolean; receipt?: string }> {
    try {
      await this.init();
      const result = await this.nwcClient!.payInvoice({ invoice });
      return { paid: true, receipt: result.preimage };
    } catch {
      return { paid: false };
    }
  }
}
