import { spawnChallengeFromTask } from "@/lib/arena";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { task_id } = body;

    if (!task_id) {
      return Response.json({ error: "task_id required" }, { status: 400 });
    }

    const challenge = await spawnChallengeFromTask(task_id);

    if (!challenge) {
      return Response.json({ error: "Task not found or not completed" }, { status: 404 });
    }

    return Response.json({
      challenge_id: challenge.id,
      category: challenge.category,
      claim: challenge.claim,
      status: challenge.status,
    });
  } catch (err) {
    console.error("Arena spawn error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
