import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const adapter = new PrismaBetterSqlite3({ url: path.resolve(__dirname, "dev.db") });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  console.log("Cleaning database...");
  
  // Child tables first to respect foreign key constraints
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

  console.log("Database cleared successfully.");
}

main()
  .catch((e) => {
    console.error("Error clearing database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
