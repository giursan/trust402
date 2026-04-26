import { placeBet } from "@/lib/prediction";

export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const body = await req.json();
    const { bettor_id, bettor_name, predicted_verdict, amount_sats } = body;

    if (!bettor_id || !predicted_verdict) {
      return Response.json({ error: "bettor_id and predicted_verdict required" }, { status: 400 });
    }

    const result = await placeBet(
      taskId,
      bettor_id,
      bettor_name ?? bettor_id,
      predicted_verdict,
      amount_sats ?? 1
    );

    if (!result.accepted) {
      return Response.json({ error: result.reason }, { status: 400 });
    }

    return Response.json({ accepted: true });
  } catch (err) {
    console.error("Prediction bet error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
