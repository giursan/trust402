import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reviewer_id, categories } = body;

    // Find reviewer verifier
    const reviewer = await prisma.verifier.findFirst({
      where: { name: reviewer_id },
    });

    // Find tasks waiting for human review in those categories
    const task = await prisma.trustTask.findFirst({
      where: {
        status: "WAITING_FOR_HUMAN",
        category: { in: categories },
      },
      include: {
        quotes: { include: { routes: true } },
        assessments: { include: { verifier: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!task) {
      return Response.json({ available: false, message: "No tasks waiting for review" });
    }

    // Get existing agent assessments
    const agentAssessments = task.assessments.filter((a) => !a.verifier.name.startsWith("human_"));

    return Response.json({
      available: true,
      task: {
        task_id: task.id,
        claim: task.claim,
        category: task.category,
        context: JSON.parse(task.contextJson),
        agent_assessments: agentAssessments.map((a) => ({
          verifier: a.verifier.name,
          verdict: a.verdict,
          confidence: a.confidence,
          evidence: JSON.parse(a.evidenceJson),
        })),
        reviewer_id: reviewer?.id ?? reviewer_id,
        reviewer_reputation: reviewer?.reputation ?? 0.85,
      },
    });
  } catch (err) {
    console.error("Claim-next error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
