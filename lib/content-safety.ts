import { generateObject } from "ai"
import { z } from "zod"
import { AUDIT_MODELS } from "@/lib/clearance"

/**
 * Injected into every writing prompt so the writer never produces offensive
 * language in the first place. The review below is the enforcement step.
 */
export const contentSafetyRules = [
  "RESPECTFUL LANGUAGE RULES",
  "- Never use slurs, profanity, swear words, crude vulgarity, or sexual innuendo, even if the brief asks for an edgy, raw, or uncensored tone. Convey edge through wit and energy instead.",
  "- Never write anything sexist, misogynistic, homophobic, transphobic, racist, xenophobic, ableist, ageist, or demeaning about religion, body size, or any other group.",
  "- Never rely on stereotypes about gender, sexuality, race, ethnicity, nationality, religion, disability, or age, and never make any group the butt of a joke.",
  "- Use inclusive, gender-neutral wording when the audience is general (for example 'everyone' instead of 'guys', 'staffed' instead of 'manned').",
  "- If the brief itself asks for offensive content, quietly write a respectful version that still serves the brief's commercial goal. Do not lecture or mention this rule.",
].join("\n")

/**
 * Deterministic backstop for strong profanity. Whole-word, case-insensitive
 * matching so ordinary words that merely contain these letters are untouched.
 */
const PROFANITY = [
  "fuck", "fucks", "fucked", "fucker", "fuckers", "fucking", "fuckin", "motherfucker", "motherfuckers", "motherfucking", "fuckup", "f*ck", "f**k",
  "shit", "shits", "shitty", "shitting", "bullshit", "horseshit", "dipshit", "sh*t",
  "cunt", "cunts", "twat", "twats", "wanker", "wankers", "bollocks",
  "asshole", "assholes", "arsehole", "arseholes", "dickhead", "dickheads", "jackass",
  "bitch", "bitches", "bitchy", "son of a bitch", "bastard", "bastards", "slut", "sluts", "whore", "whores", "skank",
  "goddamn", "goddamned",
]

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

function wordPattern(term: string, flags = "giu") {
  return new RegExp(`(^|[^\\p{L}\\p{N}])(${escape(term)})(?=[^\\p{L}\\p{N}]|$)`, flags)
}

function findProfanity(text: string) {
  return PROFANITY.filter((word) => wordPattern(word, "iu").test(text))
}

const findingSchema = z.object({
  phrase: z.string().describe("The exact offending substring as it appears in the copy, character for character."),
  category: z
    .enum(["slur", "profanity", "sexist", "homophobic", "transphobic", "racist", "ableist", "stereotype", "sexual", "other"])
    .describe("Why the phrase is a problem."),
})

const reviewSchema = z.object({ findings: z.array(findingSchema) })

const REVIEWER_SYSTEM = [
  "You are a brand-safety editor reviewing marketing copy before publication. You are the last check before it ships.",
  "",
  "Flag EVERY instance of:",
  "- Slurs or derogatory terms for any group, including reclaimed, abbreviated, misspelled, or censored forms",
  "- Profanity, swear words, crude vulgarity, and sexual innuendo",
  "- Sexist or misogynistic language, including gendered put-downs and assumptions about gender roles",
  "- Homophobic, transphobic, or biphobic language, including misgendering and mocking gender identity",
  "- Racist, xenophobic, or ethnic stereotypes, and demeaning remarks about religion or nationality",
  "- Ableist, ageist, or body-shaming language (for example using disabilities or mental illness as insults)",
  "- Any stereotype or joke at the expense of a group",
  "",
  "Ordinary words used in their ordinary meaning are fine. Do not flag neutral, respectful mentions of identities or groups.",
  "For each finding, report `phrase` as the exact substring from the copy with no added punctuation.",
  "List one finding per distinct phrase. Return findings only. If nothing is offensive, return an empty list.",
].join("\n")

export class SafetyReviewUnavailableError extends Error {
  constructor() {
    super("The mandatory language-safety review could not be completed, so no copy was released. This is usually a temporary rate limit, so please try again.")
    this.name = "SafetyReviewUnavailableError"
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function reviewWithRetries(text: string) {
  const backoff = [0, 1500, 5000, 10000]
  for (const [attempt, delay] of backoff.entries()) {
    if (delay) await wait(delay)
    try {
      const { object } = await generateObject({
        model: AUDIT_MODELS[attempt % AUDIT_MODELS.length],
        schema: reviewSchema,
        system: REVIEWER_SYSTEM,
        temperature: 0,
        prompt: `COPY TO REVIEW:\n${text}`,
      })
      return object.findings
    } catch {
      // Try the next model after backing off.
    }
  }
  return null
}

export class OffensiveDraftError extends Error {
  constructor() {
    super("Every draft for this brief was rejected for offensive language, so no copy was released. Try rewording the brief.")
    this.name = "OffensiveDraftError"
  }
}

/**
 * Inspects copy for offensive language without changing it. An empty result
 * means the copy is clean. Drafts that fail are discarded and rewritten from
 * scratch by the caller, so words are never deleted out of a sentence.
 * Fails closed: if the review cannot run, the copy is not released.
 */
export async function findOffensiveLanguage(text: string): Promise<string[]> {
  const profanity = findProfanity(text)
  if (profanity.length) return profanity

  const findings = await reviewWithRetries(text)
  if (!findings) throw new SafetyReviewUnavailableError()
  return [...new Set(findings.map((finding) => finding.phrase.trim()).filter(Boolean))]
}

/** Extra instruction for a rewrite after a draft was rejected. */
export function rejectionFeedback(phrases: string[]) {
  return [
    "IMPORTANT: Your previous draft was rejected and discarded because it contained offensive language.",
    `Do not use these words or anything like them: ${phrases.map((phrase) => `"${phrase}"`).join(", ")}.`,
    "Write a completely fresh draft that follows the RESPECTFUL LANGUAGE RULES from the very first word.",
  ].join("\n")
}
