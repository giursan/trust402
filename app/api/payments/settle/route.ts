import { prisma } from "@/lib/db";
import { getPaymentProvider, getProviderName } from "@/lib/payments/provider";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { payment_hash, task_id, force_mock_settle } = body;

    let payment = null;

    if (task_id) {
      payment = await prisma.payment.findFirst({
        where: { taskId: task_id, status: "PENDING" },
      });
    } else if (payment_hash) {
      payment = await prisma.payment.findFirst({
        where: { invoice: { contains: payment_hash }, status: "PENDING" },
      });
    }

    if (!payment) {
      return Response.json({ error: "Payment not found" }, { status: 404 });
    }

    const providerName = getProviderName();

    // For real Lightning: check if invoice is actually settled
    const paymentMetadata = payment.receiptJson ? JSON.parse(payment.receiptJson) as { payment_hash?: string } : {};

    if (providerName === "alby" && payment.invoice && !force_mock_settle) {
      const provider = getPaymentProvider();
      const check = await provider.checkInvoice(payment_hash ?? paymentMetadata.payment_hash ?? payment.invoice);
      if (!check.settled) {
        return Response.json({
          error: "Invoice not yet settled",
          provider: providerName,
          hint: "Pay the Lightning invoice first, then call settle again",
          fallback_available: true,
        }, { status: 402 });
      }
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SETTLED",
        settledAt: new Date(),
        receiptJson: JSON.stringify({
          ...paymentMetadata,
          settled: true,
          provider: force_mock_settle ? "mock_fallback" : providerName,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    await prisma.trustTask.update({
      where: { id: payment.taskId },
      data: { status: "PAID" },
    });

    return Response.json({
      payment_id: payment.id,
      task_id: payment.taskId,
      status: "settled",
      amount_sats: payment.amountSats,
      provider: force_mock_settle ? "mock_fallback" : providerName,
      fallback_used: Boolean(force_mock_settle),
    });
  } catch (err) {
    console.error("Settle error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
