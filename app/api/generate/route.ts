import { generateText } from "ai"
import { ClearanceUnavailableError, WRITER_MODEL, clearCopy, clearanceRules, encodeReport } from "@/lib/clearance"
import {
  OffensiveDraftError,
  SafetyReviewUnavailableError,
  contentSafetyRules,
  findOffensiveLanguage,
  rejectionFeedback,
} from "@/lib/content-safety"
import { plainStyleRules, sanitizeCopy } from "@/lib/sanitize"

export const maxDuration = 300

const MAX_DRAFTS = 3

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/credit card|customer_verification/i.test(message)) {
    return "AI Gateway setup is incomplete. Add a payment method in Vercel Dashboard → AI, then try again."
  }
  if (/rate.?limit|429|quota/i.test(message)) {
    return "The AI Gateway is rate-limited right now, so nothing was written or released. Wait a moment and try again, or add credits in Vercel Dashboard → AI."
  }
  if (/api key|unauthorized|401|AI_GATEWAY_API_KEY/i.test(message)) {
    return "AI Gateway is not authenticated. Connect Vercel AI Gateway, then try again."
  }
  return message || "Something went wrong while writing your copy."
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new Response("Invalid request.", { status: 400 })
  }

  const mode = body.mode === "transform" ? "transform" : "generate"
  const outputLanguage =
    typeof body.outputLanguage === "string" && body.outputLanguage.trim()
      ? body.outputLanguage.trim().slice(0, 60)
      : "English"

  let system: string
  let prompt: string
  let temperature: number

  if (mode === "transform") {
    const block = typeof body.block === "string" ? body.block.trim() : ""
    if (!block) return new Response("Select a copy block first.", { status: 400 })
    const transformation = typeof body.transformation === "string" ? body.transformation.slice(0, 40) : "tone"
    const value = typeof body.value === "string" ? body.value.slice(0, 60) : "Professional"
    const context = typeof body.context === "string" ? body.context.slice(0, 12000) : ""

    temperature = 0.6
    system = [
      "You are an expert copy editor.",
      `Rewrite only the supplied block to change its ${transformation} to ${value}.`,
      `Write exclusively in ${outputLanguage}.`,
      "Preserve its Markdown block type and approximate length. Return only the replacement block, with no commentary.",
      "Any invented names already used in the surrounding copy are established: reuse them verbatim and do not coin new substitutes for terms that already have one.",
      plainStyleRules,
      contentSafetyRules,
      clearanceRules,
    ].join("\n")
    prompt = `FULL COPY FOR CONTEXT:\n${context}\n\nBLOCK TO REWRITE:\n${block}`
  } else {
    const brief = typeof body.brief === "string" ? body.brief.trim() : ""
    if (!brief) return new Response("A brief is required.", { status: 400 })
    const target = Number(body.wordCount)
    const words = Number.isFinite(target) && target > 0 ? Math.min(Math.round(target), 3000) : 300
    const tone = typeof body.tone === "string" && body.tone ? body.tone.slice(0, 60) : "the best-fitting tone"

    temperature = 0.8
    system = [
      "You are an award-winning direct-response and brand copywriter.",
      "Understand the user's brief regardless of its input language.",
      `Write the finished copy exclusively in fluent, native-quality ${outputLanguage}.`,
      `Aim for approximately ${words} words (within 10%).`,
      `Use a ${tone} tone of voice.`,
      "Structure the copy with a compelling headline, a few useful subheadings, short paragraphs, and lists only when they genuinely improve readability.",
      "Output only the finished copy. Do not include notes, word counts, explanations, or legal commentary.",
      plainStyleRules,
      contentSafetyRules,
      clearanceRules,
    ].join("\n")
    prompt = brief
  }

  try {
    // Offensive drafts are discarded and rewritten from scratch, never patched.
    let feedback = ""
    for (let attempt = 0; attempt < MAX_DRAFTS; attempt += 1) {
      const draft = await generateText({
        model: WRITER_MODEL,
        system: feedback ? `${system}\n\n${feedback}` : system,
        prompt,
        temperature,
      })
      const written = sanitizeCopy(draft.text)
      if (!written) continue

      const rejected = await findOffensiveLanguage(written)
      if (rejected.length) {
        feedback = rejectionFeedback(rejected)
        continue
      }

      // Hard gate: copy is only released after clearance, never before.
      const { text, report } = await clearCopy(written)
      const final = sanitizeCopy(text)
      const rejectedAfterClearance = await findOffensiveLanguage(final)
      if (rejectedAfterClearance.length) {
        feedback = rejectionFeedback(rejectedAfterClearance)
        continue
      }

      return new Response(final, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Clearance": encodeReport(report),
        },
      })
    }

    if (feedback) throw new OffensiveDraftError()
    return new Response("The model returned no copy. Please try again.", { status: 502 })
  } catch (error) {
    if (error instanceof ClearanceUnavailableError || error instanceof SafetyReviewUnavailableError) {
      return new Response(error.message, { status: 503 })
    }
    if (error instanceof OffensiveDraftError) {
      return new Response(error.message, { status: 422 })
    }
    return new Response(friendlyError(error), { status: 502 })
  }
}
