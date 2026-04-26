import { submitArenaResult } from "@/lib/arena";

export async function POST(req: Request, { params }: { params: Promise<{ challengeId: string }> }) {
  try {
    const { challengeId } = await params;
    const body = await req.json();
    const { verifier_id, verdict, confidence, evidence, response_time_ms } = body;

    if (!verifier_id || !verdict) {
      return Response.json({ error: "verifier_id and verdict required" }, { status: 400 });
    }

    const result = await submitArenaResult(
      challengeId,
      verifier_id,
      verdict,
      confidence ?? 0.8,
      evidence ?? [],
      response_time_ms ?? 2000
    );

    return Response.json(result);
  } catch (err) {
    console.error("Arena submit error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
