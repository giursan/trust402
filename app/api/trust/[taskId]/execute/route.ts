import { prisma } from "@/lib/db";
import { executeTrustTask } from "@/lib/executor";
import { ROUTE_DEFINITIONS } from "@/lib/routes";

export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const body = await req.json().catch(() => ({}));
    const { payment_proof } = body;

    // Find task + payments + route
    const task = await prisma.trustTask.findUnique({
      where: { id: taskId },
      include: { payments: true, quotes: { include: { routes: true } } },
    });

    if (!task) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    // Already completed — return immediately
    if (task.status === "COMPLETED") {
      return Response.json({
        task_id: taskId,
        status: "COMPLETED",
        stream_url: `/api/trust/${taskId}/events`,
      });
    }

    // Accept PENDING or already-SETTLED payment (frontend may call /payments/settle first)
    const payment = task.payments.find((p) => p.status === "PENDING" || p.status === "SETTLED");

    if (!payment) {
      return Response.json({ error: "No payment found for this task" }, { status: 400 });
    }

    const isDemoMode = process.env.DEMO_MODE === "mock" || process.env.DEMO_MODE !== "real";

    if (payment.status === "PENDING") {
      if (isDemoMode) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "SETTLED",
            settledAt: new Date(),
            receiptJson: JSON.stringify({
              preimage: payment_proof?.preimage ?? `mock_preimage_${Date.now()}`,
              invoice: payment.invoice,
            }),
          },
        });
      } else if (payment_proof) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "SETTLED",
            settledAt: new Date(),
            preimage: payment_proof.preimage,
            l402Token: payment_proof.l402_token,
            receiptJson: JSON.stringify(payment_proof),
          },
        });
      }
    }

    // Update task to PAID
    await prisma.trustTask.update({
      where: { id: taskId },
      data: { status: "PAID" },
    });

    // Determine if this route requires human reviewers
    const selectedRoute = task.quotes
      .flatMap((q) => q.routes)
      .find((r) => r.id === task.selectedRouteId || r.routeKey === task.selectedRouteId);
    const routeDef = ROUTE_DEFINITIONS.find((d) => d.key === selectedRoute?.routeKey);
    const needsHuman = routeDef?.verifierKeys.some((k) => k.startsWith("human_")) ?? false;

    if (needsHuman) {
      // Human routes: run in background, respond immediately so reviewer dashboard can receive task
      setImmediate(() => {
        executeTrustTask(taskId).catch((err) => console.error("[executor] background error:", err));
      });
      return Response.json({
        task_id: taskId,
        status: "IN_PROGRESS",
        stream_url: `/api/trust/${taskId}/events`,
      });
    }

    // Agent-only routes: run inline (2–3s) for reliable proof delivery
    await executeTrustTask(taskId);

    return Response.json({
      task_id: taskId,
      status: "COMPLETED",
      stream_url: `/api/trust/${taskId}/events`,
    });
  } catch (err) {
    console.error("Execute error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
