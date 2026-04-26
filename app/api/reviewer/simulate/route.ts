import { prisma } from "@/lib/db";
import { emit } from "@/lib/events";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { task_id } = body;

    const task = await prisma.trustTask.findUnique({
      where: { id: task_id },
      include: {
        quotes: { include: { routes: true } },
      },
    });

    if (!task) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    // Find the first human verifier assigned to the task's route
    const selectedRoute = task.quotes
      .flatMap((q) => q.routes)
      .find((r) => r.id === task.selectedRouteId || r.routeKey === task.selectedRouteId);

    const { ROUTE_DEFINITIONS } = await import("@/lib/routes");
    const routeDef = selectedRoute
      ? ROUTE_DEFINITIONS.find((d) => d.key === selectedRoute.routeKey)
      : ROUTE_DEFINITIONS[1]; // Default to balanced

    const humanKey = routeDef?.verifierKeys.find((k) => k.startsWith("human_")) ?? "human_reviewer_17";

    const humanVerifier = await prisma.verifier.findFirst({
      where: { name: humanKey },
    });

    if (!humanVerifier) {
      return Response.json({ error: "Human verifier not found" }, { status: 404 });
    }

    const verdict = "unsafe";
    const confidence = 0.91;
    const evidence = [
      "No legally valid imprint",
      "Fake trust badge",
      "Price anomaly detected",
    ];

    // Create Assessment
    const assessment = await prisma.assessment.create({
      data: {
        taskId: task_id,
        verifierId: humanVerifier.id,
        verdict,
        confidence,
        evidenceJson: JSON.stringify(evidence),
        latencyMs: 3500,
        costSats: humanVerifier.minPriceSats,
      },
    });

    // Emit event
    emit(task_id, "assessment_submitted", {
      verifier: humanKey,
      verdict,
      confidence,
      evidence,
      is_human: true,
      simulated: true,
    });

    return Response.json({
      assessment_id: assessment.id,
      verifier: humanKey,
      verdict,
      confidence,
      evidence,
      status: "simulated",
    });
  } catch (err) {
    console.error("Simulate error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
