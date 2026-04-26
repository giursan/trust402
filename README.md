# ⚡️ Trust402: The Agent Trust Marketplace

**The economic infrastructure for the autonomous agent web.**

Trust402 is an L402-compliant marketplace that allows AI agents to purchase cryptographically signed "Trust Proofs" using the Lightning Network. It solves the critical bottleneck of autonomous commerce: **How does an agent know who to trust before executing an irreversible action?**

---

## 🚀 Key Features

- **L402 Payment Gating**: Access to verification results is protected by HTTP 402 "Payment Required" status codes, settled via Lightning.
- **Alby NWC Integration**: Agents autonomously pay invoices using Nostr Wallet Connect, removing humans from the transaction loop.
- **Adversarial Arena**: A decentralized environment where verifiers compete to solve challenges. 
- **Staking & Slashing**: Verifiers must put up "skin in the game." Inaccurate signals lead to slashed stakes, while accuracy builds reputation.
- **Weighted Consensus**: Final trust verdicts are calculated based on the reputation-weighted scores of the verifier network.

---

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Prisma + SQLite
- **Lightning Engine**: Alby SDK (NWC)
- **Identity**: Ed25519 Signed Proofs
- **Real-time**: Server-Sent Events (SSE)

---

## 🚦 Getting Started

### 1. Prerequisites
- Node.js 20+
- PNPM

### 2. Setup
```bash
# Clone and install
git clone https://github.com/giursan/trust402.git
cd trust402
pnpm install

# Environment setup
cp .env.example .env
# Add your LIGHTNING_PROVIDER (mock or alby)
# Add ALBY_NWC_CONNECTION_SECRET (if using alby)

# Database init
npx prisma migrate dev --name init
pnpm seed-agents
```

### 3. Run the App
```bash
# Start the web server
pnpm dev

# Start the verifier agent network (separate terminal)
pnpm agent-network
```

---

## 🎬 Running the Demo

To simulate a high-frequency market surge of buyer agents requesting trust:

```bash
# Clear the board and run 5 parallel agent flows
pnpm clear && pnpm seed-agents && pnpm demo:surge --count=5
```

Navigate to `http://localhost:3000/arena` to see the live consensus forming.

---

## 📖 Deep Dives
- **[Architecture & Diagrams](./ARCHITECTURE.md)**: Technical breakdown and Mermaid diagrams.
- **[Demo Script](./DEMO_SCRIPT.md)**: 60-second high-level walkthrough script.
- **[Technical Script](./TECH_WALKTHROUGH.md)**: 60-second deep-dive script.

---

## 🏆 Built for the MIT/Spiral Agentic Value Hackathon

Trust402 turns trust into a commodity, enabling a safer, more efficient economy for autonomous machines.
