import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;

    const proof = await prisma.trustProof.findUnique({
      where: { taskId },
      include: {
        task: {
          include: {
            assessments: { include: { verifier: true } },
          },
        },
      },
    });

    if (!proof) {
      return Response.json({ error: "Proof not found" }, { status: 404 });
    }

    const payouts = await prisma.payout.findMany({
      where: { taskId },
      include: { verifier: true },
    });

    const proofData = JSON.parse(proof.proofJson);

    return Response.json({
      ...proofData,
      db_id: proof.id,
      task_id: taskId,
      verdict: proof.verdict,
      confidence: proof.confidence,
      evidence: JSON.parse(proof.evidenceJson),
      signature: proof.signature,
      created_at: proof.createdAt,
      payouts: payouts.map((p) => ({
        verifier_id: p.verifierId,
        verifier_name: p.verifier.name,
        amount_sats: p.amountSats,
        status: p.status,
      })),
      assessments: proof.task.assessments.map((a) => ({
        verifier_name: a.verifier.name,
        verifier_type: a.verifier.type,
        verdict: a.verdict,
        confidence: a.confidence,
        evidence: JSON.parse(a.evidenceJson),
        latency_ms: a.latencyMs,
        cost_sats: a.costSats,
      })),
    });
  } catch (err) {
    console.error("Proof error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
