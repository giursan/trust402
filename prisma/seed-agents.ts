import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const adapter = new PrismaBetterSqlite3({ url: path.resolve(__dirname, "dev.db") });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  // Clear first
  console.log("Cleaning database...");
  await prisma.predictionPosition.deleteMany();
  await prisma.predictionMarket.deleteMany();
  await prisma.arenaResult.deleteMany();
  await prisma.arenaChallenge.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.trustProof.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.routeOption.deleteMany();
  await prisma.marketQuote.deleteMany();
  await prisma.marketEvent.deleteMany();
  await prisma.trustTask.deleteMany();
  await prisma.verifier.deleteMany();
  await prisma.buyerAgent.deleteMany();

  console.log("Seeding agents...");
  await prisma.verifier.createMany({
    data: [
      { name: "domain_age_agent", type: "TOOL_AGENT", category: "shopping_scam,source_check,code_security,legal_clause", reputation: 0.81, minPriceSats: 3, avgLatencySec: 1, stakeSats: 50 },
      { name: "ssl_agent", type: "TOOL_AGENT", category: "shopping_scam,source_check", reputation: 0.79, minPriceSats: 2, avgLatencySec: 1, stakeSats: 30 },
      { name: "visual_page_agent", type: "SPECIALIST_AGENT", category: "shopping_scam", reputation: 0.88, minPriceSats: 8, avgLatencySec: 5, stakeSats: 100 },
      { name: "fraud_lens_agent", type: "SPECIALIST_AGENT", category: "shopping_scam,source_check", reputation: 0.94, minPriceSats: 12, avgLatencySec: 8, stakeSats: 200 },
      { name: "osint_reputation_agent", type: "SPECIALIST_AGENT", category: "shopping_scam,source_check", reputation: 0.83, minPriceSats: 7, avgLatencySec: 4, stakeSats: 90 },
      { name: "checkout_guard_agent", type: "SPECIALIST_AGENT", category: "shopping_scam", reputation: 0.86, minPriceSats: 6, avgLatencySec: 3, stakeSats: 85 },
      { name: "brand_impersonation_agent", type: "SPECIALIST_AGENT", category: "shopping_scam,source_check", reputation: 0.84, minPriceSats: 7, avgLatencySec: 4, stakeSats: 95 },
      { name: "policy_reasoner_agent", type: "TOOL_AGENT", category: "shopping_scam,source_check,code_security,legal_clause", reputation: 0.82, minPriceSats: 5, avgLatencySec: 2, stakeSats: 70 },
      { name: "package_risk_agent", type: "SPECIALIST_AGENT", category: "code_security", reputation: 0.89, minPriceSats: 11, avgLatencySec: 6, stakeSats: 140 },
      { name: "legal_clause_agent", type: "SPECIALIST_AGENT", category: "legal_clause", reputation: 0.91, minPriceSats: 13, avgLatencySec: 7, stakeSats: 150 },
      { name: "human_reviewer_17", type: "HUMAN", category: "shopping_scam,source_check,legal_clause", reputation: 0.96, minPriceSats: 20, avgLatencySec: 74, stakeSats: 150 },
      { name: "human_reviewer_22", type: "HUMAN", category: "shopping_scam,code_security", reputation: 0.88, minPriceSats: 15, avgLatencySec: 90, stakeSats: 80 },
      { name: "human_reviewer_31", type: "HUMAN", category: "legal_clause,source_check", reputation: 0.91, minPriceSats: 18, avgLatencySec: 110, stakeSats: 120 },
    ],
  });

  await prisma.buyerAgent.create({
    data: {
      id: "agent_shopper_demo",
      name: "ShopperAgent",
      policyJson: JSON.stringify({
        must_verify_before: ["unknown_domain", "checkout_page", "payment_request"],
        max_auto_spend_sats: 100,
        min_confidence_required: 0.9,
        risk_tolerance: "low",
      }),
    },
  });

  // Challenger agent for the Arena demo
  await prisma.verifier.create({
    data: {
      name: "challenger_agent_1",
      type: "SPECIALIST_AGENT",
      category: "shopping_scam,source_check",
      reputation: 0.5,
      minPriceSats: 5,
      avgLatencySec: 3,
      stakeSats: 0,
      arenaScore: 0,
      arenaAttempts: 0,
      arenaPassed: false,
    },
  });

  console.log("Seeded agents and verifiers successfully (skipped challenges).");
}

main().finally(() => prisma.$disconnect());
