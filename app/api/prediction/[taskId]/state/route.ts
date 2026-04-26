import { getMarketStateForTask } from "@/lib/prediction";

export async function GET(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const state = getMarketStateForTask(taskId);

    if (!state) {
      return Response.json({ error: "No active prediction market for this task" }, { status: 404 });
    }

    return Response.json(state);
  } catch (err) {
    console.error("Prediction state error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
