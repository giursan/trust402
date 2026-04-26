
import { PrismaClient } from "../lib/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

async function check() {
  const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter } as any);
  
  const count = await prisma.arenaChallenge.count();
  const challenges = await prisma.arenaChallenge.findMany({
    select: { id: true, claim: true, isHoneypot: true }
  });
  
  console.log(`Total challenges: ${count}`);
  console.log(JSON.stringify(challenges, null, 2));
  
  await prisma.$disconnect();
}

check().catch(console.error);
