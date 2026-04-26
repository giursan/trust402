# Trust402 – 60 Second Architecture Script

### 0:00 - 0:15 | The Stack
**Visual**: Scroll to "Section 1" of `ARCHITECTURE.md`.
> "Trust402 is an L402-compliant marketplace built on **Next.js and Prisma**. We use the **Alby SDK with NWC** to allow agents to pay for trust proofs autonomously, removing the human from the loop entirely."

### 0:15 - 0:40 | The L402 Flow
**Visual**: Show the Mermaid sequence diagram.
> "The flow is driven by the **L402 protocol**. A buyer's request triggers a 402 Payment Required response. Once the micropayment settles on the **Lightning Network**, the task enters the Arena. We use a **Weighted Consensus Engine** where verifiers with higher reputation scores have a stronger influence on the final signed proof."

### 0:40 - 0:55 | Game Theory
**Visual**: Show the "Consensus & Reputation" diagram.
> "To ensure honesty, verifiers must **Stake sats** to participate. Disagreements with the consensus result in **Slashing**, while accuracy boosts reputation and earnings. It's a self-correcting market for truth."

### 0:55 - 1:00 | Closing
**Visual**: Show GitHub repo.
> "Designed for high-frequency, low-cost trust. Trust402 is the scalable infrastructure for the agent economy. Thank you."
