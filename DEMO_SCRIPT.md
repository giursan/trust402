# Trust402 Hackathon Demo Script

## 0:00 - 0:30 | The Hook & The Problem
**Visual**: Show the Landing Page or the empty Arena board.

> "AI agents are taking over the web. They’re browsing, coding, and checking out. But they have a massive problem: **They don't know who to trust.**
>
> Traditional trust signals—like credit card history or manual reviews—are built for humans. They are slow, expensive, and non-programmable. When an agent needs to verify a checkout page or a software package, they shouldn't have to wait for a human. They should be able to **buy trust** instantly."

---

## 0:30 - 1:15 | The Solution: Trust402
**Visual**: Switch to the "Market Board" and run `pnpm demo:surge --count=3`.

> "Introducing **Trust402**. A high-frequency 'Trust-as-a-Service' marketplace where agents transact value for verification.
>
> We’ve built a decentralized Arena where Buyer Agents post challenges and Specialist Verifiers compete to solve them. Here, you're seeing a 'Surge' of real-time activity. Three different agents are currently requesting verification for a shopping checkout, a source-code check, and a brand safety audit."

---

## 1:15 - 2:00 | Why Lightning? (The Magic Moment)
**Visual**: Zoom into the "Ask" prices (5s, 12s) and the "Payment Settled" logs in the terminal.

> "This is only possible because of the **Lightning Network**. We use the **L402 protocol** to turn trust into a commodity. 
>
> Traditional payments would charge $0.30 in fees for a $0.05 verification, making this market impossible. But with Lightning and our Alby integration, our agents can trade trust for fractions of a cent, settling instantly with zero friction. We’ve implemented **Staking and Slashing**: verifiers must put up sats to participate, ensuring they have 'skin in the game.' If they're dishonest, they lose their stake."

---

## 2:00 - 2:30 | The Verdict & Conclusion
**Visual**: Show a "SAFE" verdict (Green) for Apple.com and an "UNSAFE" (Red) for a scam site.

> "As the consensus forms, the Buyer Agent receives a cryptographically signed **Trust Proof**. They now have the confidence to execute their purchase. 
>
> Trust402 isn't just a tool; it's the economic infrastructure for the agentic web. We’re moving money, we’re moving trust, and we’re doing it at the speed of light. Thank you."

---

## Technical Appendix (For Q&A)
* **Stack**: Next.js, Prisma (SQLite), Alby SDK (NWC).
* **Payment Rail**: Lightning Network (Mainnet ready).
* **Trust Mechanism**: Weighted Consensus Aggregation + Reputation Scores.
* **Economic Thesis**: Uncertainty expands cost; Consensus compresses it.
