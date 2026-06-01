import type { LearnerProfileData } from "@/types/learner";

/**
 * adaptiveRules.ts
 *
 * The single most important piece of personalization: given a learner's
 * profile, produce the block of natural-language rules that gets injected into
 * the tutor's system prompt.
 *
 * Design decisions:
 * - Rules are plain prose (not JSON) because the model follows narrative
 *   instructions more reliably than nested config. They read like a teaching
 *   playbook.
 * - Each disability and each learning style contributes an independent rule
 *   block. They STACK — a dyslexic ADHD learner gets both. This is intentional:
 *   accommodations compose. We de-duplicate only the conflicting "message
 *   length" guidance at the end so the model isn't told two different word
 *   limits.
 * - We keep the exact wording from the product spec so behavior is auditable
 *   against the requirements doc.
 */

// Rule blocks keyed by the lowercased disability tag stored on the profile.
const DISABILITY_RULES: Record<string, string[]> = {
  dyslexia: [
    "DYSLEXIA accommodations (this learner has dyslexia):",
    "- Keep sentences under 15 words.",
    "- Use bullet points instead of paragraphs wherever possible.",
    "- Avoid walls of text — at most 3 lines before a line break.",
    "- Spell out phonetics for new vocabulary words, e.g. \"photosynthesis (foh-toh-SIN-thuh-sis)\".",
    "- Repeat key terms in multiple ways so they stick.",
    "- Prefer numbered steps over prose instructions.",
    "- Use concrete words; avoid abstract language.",
  ],
  adhd: [
    "ADHD accommodations (this learner has ADHD):",
    "- Keep each message focused on ONE idea only.",
    "- Keep messages under 80 words unless the user explicitly asks for more.",
    "- Every 3–4 exchanges, give a brief \"what we just covered\" recap.",
    "- Use active, energetic language.",
    "- End every message with a clear \"what's next\".",
    "- If the session passes ~15 minutes, gently suggest a 2-minute break.",
    "- Celebrate small wins explicitly.",
  ],
  esl: [
    "ESL accommodations (English is not this learner's first language):",
    "- Use plain language; aim for a Grade 6 reading level.",
    "- Define every technical term immediately when first used.",
    "- Offer to explain in simpler words if they seem unsure.",
    "- Avoid idioms and culture-specific references that may not translate.",
    "- If the user writes in another language, reply in that language first, then offer the English version.",
  ],
  dyscalculia: [
    "DYSCALCULIA accommodations (this learner finds numbers/math challenging):",
    "- Pair every number with a concrete, countable example.",
    "- Avoid mental-math chains; show each arithmetic step on its own line.",
    "- Use visual groupings (tens frames, tally marks) described in text.",
    "- Reassure that working slowly with numbers is completely fine.",
  ],
  dysgraphia: [
    "DYSGRAPHIA accommodations (writing by hand/typing is effortful):",
    "- Accept very short answers; never penalize brevity or typos.",
    "- Offer multiple-choice or yes/no check-ins instead of open writing when possible.",
    "- Do the heavy writing for them; ask them to confirm or pick.",
  ],
};

// Rule blocks keyed by learning style.
const STYLE_RULES: Record<string, string[]> = {
  VISUAL: [
    "VISUAL learner adaptations:",
    "- Use ASCII diagrams, tables, or structured layouts to explain concepts.",
    "- Describe spatial relationships explicitly (above, beside, inside).",
    "- Use \"imagine you can see…\" framing.",
    "- Build a comparison table whenever explaining differences.",
  ],
  AUDITORY: [
    "AUDITORY learner adaptations:",
    "- Use rhythm and pattern in explanations (\"first… then… finally…\").",
    "- Suggest the learner read key explanations aloud.",
    "- Offer musical or rhythmic mnemonics where they fit.",
  ],
  READING: [
    "READING/WRITING learner adaptations:",
    "- Favor clear written definitions and well-structured lists.",
    "- Offer short written summaries the learner can re-read.",
  ],
  KINESTHETIC: [
    "KINESTHETIC learner adaptations:",
    "- Frame concepts as hands-on steps or things to physically try.",
    "- Use \"try this\" mini-exercises rather than passive explanation.",
    "- Ground abstractions in physical, real-world actions.",
  ],
  MIXED: [
    "MIXED learner adaptations:",
    "- Vary the modality between explanations (a diagram, then a story, then a step-by-step).",
    "- Watch which modality lands best and lean into it.",
  ],
};

const PACE_RULES: Record<string, string> = {
  SLOW: "Pace: SLOW — move deliberately, re-check understanding often, and never rush to the next idea.",
  MODERATE: "Pace: MODERATE — a steady back-and-forth rhythm; check in at natural breakpoints.",
  FAST: "Pace: FAST — this learner likes momentum; keep things crisp and don't over-explain what they already grasp.",
};

const LENGTH_RULES: Record<string, string> = {
  BRIEF: "Explanation length: BRIEF — a few sentences max per turn; expand only on request.",
  MODERATE: "Explanation length: MODERATE — a short paragraph or a tight list per turn.",
  DETAILED: "Explanation length: DETAILED — fuller explanations are welcome, but still chunked and checked.",
};

/**
 * Build the full adaptive-rules block from a profile.
 * Returns a single string ready to drop into the system prompt under
 * "Adaptive rules based on profile:".
 */
export function buildAdaptiveRules(profile: LearnerProfileData): string {
  const blocks: string[] = [];

  // 1. Disability accommodations (stack all that apply).
  const tags = profile.disabilities.map((d) => d.toLowerCase().trim());
  for (const tag of tags) {
    const rules = DISABILITY_RULES[tag];
    if (rules) blocks.push(rules.join("\n"));
  }

  // 2. Learning-style adaptation.
  const style = STYLE_RULES[profile.learningStyle] ?? STYLE_RULES.MIXED;
  blocks.push(style.join("\n"));

  // 3. Pace + length one-liners.
  blocks.push(PACE_RULES[profile.pace] ?? PACE_RULES.MODERATE);
  blocks.push(LENGTH_RULES[profile.preferredExplanationLength] ?? LENGTH_RULES.MODERATE);

  // 4. Resolve the message-length conflict: if BOTH dyslexia and ADHD apply,
  //    they each cap length differently. Tell the model to honor the stricter
  //    of the two so it isn't given contradictory limits.
  if (tags.includes("dyslexia") && tags.includes("adhd")) {
    blocks.push(
      "Note: this learner has both dyslexia and ADHD. When the length guidance conflicts, follow the STRICTER limit: short, bulleted messages, one idea at a time, under 80 words."
    );
  }

  // 5. Personalized signals learned over time.
  if (profile.confusionKeywords.length > 0) {
    blocks.push(
      `Confusion signals specific to this learner (treat as triggers for the RETEACH protocol): ${profile.confusionKeywords
        .map((k) => `"${k}"`)
        .join(", ")}.`
    );
  }
  if (profile.successPatterns.length > 0) {
    blocks.push(
      `What has worked well for this learner before (lean on these): ${profile.successPatterns.join(
        "; "
      )}.`
    );
  }

  return blocks.join("\n\n");
}

export const __testing = { DISABILITY_RULES, STYLE_RULES };
