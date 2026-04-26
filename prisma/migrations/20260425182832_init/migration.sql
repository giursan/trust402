-- CreateTable
CREATE TABLE "BuyerAgent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "publicKey" TEXT,
    "walletAddress" TEXT,
    "policyJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Verifier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reputation" REAL NOT NULL DEFAULT 0.5,
    "availabilityScore" REAL NOT NULL DEFAULT 1.0,
    "minPriceSats" INTEGER NOT NULL DEFAULT 1,
    "avgLatencySec" INTEGER NOT NULL DEFAULT 10,
    "walletAddress" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "stakeSats" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TrustTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyerAgentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "contextJson" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "maxBudgetSats" INTEGER NOT NULL,
    "deadlineSeconds" INTEGER NOT NULL,
    "minConfidence" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUOTED',
    "selectedRouteId" TEXT,
    "finalVerdict" TEXT,
    "finalConfidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrustTask_buyerAgentId_fkey" FOREIGN KEY ("buyerAgentId") REFERENCES "BuyerAgent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "demandLevel" TEXT NOT NULL,
    "humanLiquidity" INTEGER NOT NULL,
    "agentLiquidity" INTEGER NOT NULL,
    "medianPriceSats" INTEGER NOT NULL,
    "rushPremiumPct" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketQuote_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TrustTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RouteOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceSats" INTEGER NOT NULL,
    "expectedConfidence" REAL NOT NULL,
    "expectedLatencySeconds" INTEGER NOT NULL,
    "sellerPlanJson" TEXT NOT NULL,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "RouteOption_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "MarketQuote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amountSats" INTEGER NOT NULL,
    "invoice" TEXT,
    "preimage" TEXT,
    "l402Token" TEXT,
    "provider" TEXT NOT NULL,
    "receiptJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" DATETIME,
    CONSTRAINT "Payment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TrustTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "evidenceJson" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "costSats" INTEGER NOT NULL,
    "signature" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assessment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TrustTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assessment_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "Verifier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrustProof" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "evidenceJson" TEXT NOT NULL,
    "proofJson" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrustProof_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TrustTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "verifierId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "amountSats" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invoice" TEXT,
    "paymentHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    CONSTRAINT "Payout_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "Verifier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "taskId" TEXT,
    "payloadJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "TrustProof_taskId_key" ON "TrustProof"("taskId");
