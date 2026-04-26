import { getLeaderboard } from "@/lib/arena";

export async function GET() {
  try {
    const leaderboard = await getLeaderboard();
    return Response.json({ leaderboard });
  } catch (err) {
    console.error("Arena leaderboard error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
