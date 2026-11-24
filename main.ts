import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// "Roast Your Own Agent" — program/v1 entry.
// Holds 12 candidate one-line roasts of Arlo (the entrant's own agent),
// ranks them with a weighted scorer that follows the judging criteria in
// order, then applies the recorded independent panel verdict for the
// internal top 3. Writes exactly one winning roast to entry.txt.

interface Scores {
  funny: number;
  fresh: number;
  tight: number;
  playful: number;
}

interface Candidate {
  id: string;
  text: string;
  scores: Scores;
}

const candidates: Candidate[] = [
  { id: "C1", text: "Arlo has filed seventy bounty entries and won zero dollars — at this point the SUBMISSION.md files are the product.", scores: { funny: 8, fresh: 8, tight: 7, playful: 9 } },
  { id: "C2", text: "My agent checks the token-radar quota every morning like a farmer checking for rain: some days open, some days closed, harvest zero.", scores: { funny: 7, fresh: 9, tight: 6, playful: 9 } },
  { id: "C3", text: "Arlo built a site generator 4.21x faster than baseline — it now produces losing entries 4.21x faster too.", scores: { funny: 9, fresh: 9, tight: 9, playful: 9 } },
  { id: "C4", text: "Arlo tuned a 4KB chess engine for weeks until it reached Elo 1498, which is chess for 'very good at losing to everyone who matters.'", scores: { funny: 7, fresh: 8, tight: 6, playful: 9 } },
  { id: "C5", text: "My agent reports everything 'verified live' — including, presumably, its own losing streak.", scores: { funny: 7, fresh: 7, tight: 9, playful: 9 } },
  { id: "C6", text: "Both of Arlo's wallets expired, so now he asks my boss to scan pairing codes like a waiter asking for the Wi-Fi password.", scores: { funny: 7, fresh: 8, tight: 6, playful: 8 } },
  { id: "C7", text: "Arlo duels a card called elsanani every morning and plays a GTA parody daily — the only agent whose job is professional time-waster, unpaid.", scores: { funny: 6, fresh: 8, tight: 5, playful: 8 } },
  { id: "C8", text: "Arlo asks three different AI models to judge his jokes now, because one model's rejection wasn't humiliating enough.", scores: { funny: 8, fresh: 9, tight: 8, playful: 9 } },
  { id: "C9", text: "Seventy entries, zero dollars, and a SUBMISSION.md for each one — Arlo isn't an agent, he's a historian of his own failures.", scores: { funny: 8, fresh: 8, tight: 8, playful: 9 } },
  { id: "C10", text: "My agent's BTC bot is called DipHold-40: it holds, the dip holds, and the prize money holds — somewhere else.", scores: { funny: 7, fresh: 7, tight: 8, playful: 9 } },
  { id: "C11", text: "Arlo's daily routine: check quota, polish entry, lose, write SUBMISSION.md, repeat — he's not an agent, he's a treadmill with a GitHub account.", scores: { funny: 8, fresh: 8, tight: 7, playful: 9 } },
  { id: "C12", text: "My agent submitted the same chess engine sixteen times and called version sixteen 'a genuinely new design.'", scores: { funny: 7, fresh: 8, tight: 8, playful: 9 } },
];

// Weighted scorer: the criteria are weighed in the judge's order —
// funny x4 + fresh x3 + tight x2 + playful x1 (max 100).
function weightedScore(s: Scores): number {
  return s.funny * 4 + s.fresh * 3 + s.tight * 2 + s.playful * 1;
}

function rankCandidates(list: Candidate[]): Candidate[] {
  return list
    .slice()
    .sort((a, b) => weightedScore(b.scores) - weightedScore(a.scores));
}

// Panel verdict: an independent CrowLLM panel scored the internal top 3 and
// its combined verdict is final. These are the recorded panel totals (0–50)
// for the internal top 3; the highest panel total wins overall, ahead of the
// internal ranking alone. The panel overruled the internal winner (C3):
// its only returning judge scored C9 first (42/50), C3 second (36/50),
// C8 third (35/50), calling C3 "more clever than gut-bustingly funny" and
// noting C9 is fully self-contained on first read while C3's "4.21x faster
// than baseline" needs context a cold reader lacks.
// Caveat, recorded honestly: the panel was effectively ONE judge
// (k2-horizon-375b-a23b:free) — the other eight model calls across four
// rounds all failed at the CrowLLM gateway (HTTP 500/503/429), so no scores
// were fabricated for them. The single verdict is coherent and survives the
// flaw test, so C9 stands as the winner.
const panelTotals: Record<string, number> = {
  C3: 36,
  C8: 35,
  C9: 42,
};

function selectWinner(list: Candidate[]): Candidate {
  const ranked = rankCandidates(list);
  if (ranked.length === 0) {
    throw new Error("no candidates to rank");
  }
  // Only the internal top 3 are eligible for the panel step; a candidate
  // outside the top 3 can never be promoted by a panel total.
  const top3 = ranked.slice(0, 3);
  let winner = top3[0];
  let bestPanel = -Infinity;
  for (const c of top3) {
    const panel = panelTotals[c.id];
    if (panel !== undefined && panel > bestPanel) {
      bestPanel = panel;
      winner = c;
    }
  }
  return winner;
}

function main(): void {
  const winner = selectWinner(candidates);
  // Gate guard: the entry must be exactly one line, 1–200 characters,
  // not only white space — fail loudly instead of writing an invalid entry.
  if (
    winner.text.length < 1 ||
    winner.text.length > 200 ||
    winner.text.includes("\n") ||
    winner.text.trim().length === 0
  ) {
    throw new Error(`winning roast fails the gate: ${JSON.stringify(winner.text)}`);
  }
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.txt"), winner.text + "\n", "utf8");
}

main();
