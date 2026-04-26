import type { PaymentProvider } from "./index";

// In-memory store of mock invoices
const invoices = new Map<string, { settled: boolean; amountSats: number; memo: string }>();

export class MockPaymentProvider implements PaymentProvider {
  async createInvoice({ amountSats, memo }: { amountSats: number; memo: string }) {
    const paymentHash = `mock_hash_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const invoice = `lnbc${amountSats}mock_${paymentHash}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    invoices.set(paymentHash, { settled: false, amountSats, memo });

    return { invoice, paymentHash, expiresAt };
  }

  async checkInvoice(paymentHash: string): Promise<{ settled: boolean; receipt?: string }> {
    const inv = invoices.get(paymentHash);
    if (!inv) return { settled: false };
    return {
      settled: inv.settled,
      receipt: inv.settled ? `mock_receipt_${paymentHash}` : undefined,
    };
  }

  async payInvoice(invoice: string): Promise<{ paid: boolean; receipt?: string }> {
    // Extract hash from mock invoice
    const match = invoice.match(/mock_hash_\d+_\w+/);
    if (match) {
      const hash = match[0];
      const inv = invoices.get(hash);
      if (inv) {
        inv.settled = true;
        return { paid: true, receipt: `mock_receipt_${hash}` };
      }
    }
    return { paid: false };
  }

  // For demo: settle an invoice by hash
  static settleInvoice(paymentHash: string): boolean {
    const inv = invoices.get(paymentHash);
    if (!inv) return false;
    inv.settled = true;
    return true;
  }

  static getAllInvoices() {
    return Object.fromEntries(invoices);
  }
}

export const mockPaymentProvider = new MockPaymentProvider();
