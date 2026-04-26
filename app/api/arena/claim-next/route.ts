import { claimNextChallenge } from "@/lib/arena";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { verifier_id } = body;

    if (!verifier_id) {
      return Response.json({ error: "verifier_id required" }, { status: 400 });
    }

    const challenge = await claimNextChallenge(verifier_id);

    if (!challenge) {
      return Response.json({ available: false, message: "No challenges available" });
    }

    return Response.json({ available: true, challenge });
  } catch (err) {
    console.error("Arena claim-next error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
