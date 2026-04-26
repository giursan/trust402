import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const verifiers = await prisma.verifier.findMany({
      orderBy: [
        { arenaPassed: "asc" },
        { arenaAttempts: "asc" },
        { name: "asc" },
      ],
    });

    return Response.json({
      verifiers: verifiers.map((verifier) => ({
        verifier_id: verifier.id,
        name: verifier.name,
        type: verifier.type,
        arena_score: verifier.arenaScore,
        arena_attempts: verifier.arenaAttempts,
        graduated: verifier.arenaPassed,
        reputation: verifier.reputation,
      })),
    });
  } catch (err) {
    console.error("Arena verifiers error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
