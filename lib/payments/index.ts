export interface PaymentProvider {
  createInvoice(args: { amountSats: number; memo: string }): Promise<{
    invoice: string;
    paymentHash: string;
    expiresAt: string;
  }>;
  checkInvoice(paymentHash: string): Promise<{ settled: boolean; receipt?: string }>;
  payInvoice?(invoice: string): Promise<{ paid: boolean; receipt?: string }>;
}

export { MockPaymentProvider } from "./mock-provider";
