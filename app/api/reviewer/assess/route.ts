import { prisma } from "@/lib/db";
import { emit } from "@/lib/events";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { task_id, reviewer_id, verdict, confidence, evidence } = body;

    // Find reviewer verifier
    const reviewer = await prisma.verifier.findFirst({
      where: { name: reviewer_id },
    });

    if (!reviewer) {
      return Response.json({ error: "Reviewer not found" }, { status: 404 });
    }

    // Create Assessment
    const assessment = await prisma.assessment.create({
      data: {
        taskId: task_id,
        verifierId: reviewer.id,
        verdict,
        confidence: confidence / 100, // Convert from 0-100 to 0-1
        evidenceJson: JSON.stringify(evidence),
        latencyMs: 5000,
        costSats: reviewer.minPriceSats,
      },
    });

    // Emit event
    emit(task_id, "assessment_submitted", {
      verifier: reviewer_id,
      verdict,
      confidence: confidence / 100,
      evidence,
      is_human: true,
    });

    return Response.json({
      assessment_id: assessment.id,
      status: "accepted",
      earned_sats: reviewer.minPriceSats,
    });
  } catch (err) {
    console.error("Assess error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
