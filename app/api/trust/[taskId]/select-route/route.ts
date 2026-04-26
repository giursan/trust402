import { prisma } from "@/lib/db";
import { getPaymentProvider, getProviderName } from "@/lib/payments/provider";

export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const body = await req.json();
    const { route_id } = body;

    // Find task with quotes and routes
    const task = await prisma.trustTask.findUnique({
      where: { id: taskId },
      include: { quotes: { include: { routes: true } } },
    });

    if (!task) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    // Find matching route
    const route = task.quotes
      .flatMap((q) => q.routes)
      .find((r) => r.routeKey === route_id || r.id === route_id);

    if (!route) {
      return Response.json({ error: "Route not found" }, { status: 404 });
    }

    // Create invoice
    const provider = getPaymentProvider();
    const invoiceResult = await provider.createInvoice({
      amountSats: route.priceSats,
      memo: `Trust402 verification: ${task.claim.slice(0, 50)}`,
    });

    // Create Payment record
    const payment = await prisma.payment.create({
      data: {
        taskId: task.id,
        type: "LIGHTNING",
        status: "PENDING",
        amountSats: route.priceSats,
        invoice: invoiceResult.invoice,
        provider: getProviderName(),
        receiptJson: JSON.stringify({
          payment_hash: invoiceResult.paymentHash,
          expires_at: invoiceResult.expiresAt,
        }),
      },
    });

    // Update task
    await prisma.trustTask.update({
      where: { id: taskId },
      data: {
        selectedRouteId: route.id,
        status: "PAYMENT_PENDING",
      },
    });

    return Response.json({
      task_id: taskId,
      payment_id: payment.id,
      invoice: invoiceResult.invoice,
      payment_hash: invoiceResult.paymentHash,
      amount_sats: route.priceSats,
      expires_at: invoiceResult.expiresAt,
      route: {
        route_id: route.routeKey,
        label: route.label,
        price_sats: route.priceSats,
        expected_confidence: route.expectedConfidence,
      },
    });
  } catch (err) {
    console.error("Select route error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
