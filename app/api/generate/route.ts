import { streamText } from "ai"

export const maxDuration = 60

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/credit card|customer_verification/i.test(message)) {
    return "AI Gateway setup is incomplete. Add a payment method in Vercel Dashboard → AI, then try again."
  }
  if (/api key|unauthorized|401|AI_GATEWAY_API_KEY/i.test(message)) {
    return "AI Gateway is not authenticated. Connect Vercel AI Gateway, then try again."
  }
  return message || "Something went wrong while writing your copy."
}

const trademarkGuardrail = [
  "1. SUBSTITUTE, NEVER REFUSE",
  "The brief may reference real brands, works, or people. Never refuse, warn, hedge, or ask permission because of such a reference. Silently substitute a fictional equivalent and deliver the requested copy in full.",
  "",
  "2. WHAT MUST BE REPLACED",
  "Replace the following if present in the input, and never introduce them on your own:",
  "- Company, brand, product, and service names",
  "- Slogans, taglines, jingles, campaign lines, and branded hashtags",
  "- Titles and characters from films, TV, books, games, music, and franchises",
  "- Lyrics, quotations, or any verbatim or near-verbatim text from a published source",
  "- Names of real people, living or dead, and descriptions of their likeness",
  "- Trademarked or proprietary terminology, including genericized marks (velcro, band-aid, jacuzzi, xerox) and stylized/registered spellings",
  "- Domain names, app names, and social handles belonging to a real entity",
  "",
  "3. HOW TO REPLACE",
  "- Coin a new name. It must be a genuinely invented term, never a phonetic or orthographic variant of the original (no \"Nyke\", \"Coka-Cola\", \"Spotifi\").",
  "- Check each coined name against your knowledge of existing companies, products, and works in any market or language. If it matches one, discard it and coin another.",
  "- Preserve function, not identity: the substitute carries the same category, register, and market positioning as the original so the copy still serves the design brief.",
  "- One input term maps to exactly one substitute, applied consistently in every instance across the entire output.",
  "- Write all slogans and taglines from scratch. Do not paraphrase, remix, translate, invert, or reorder an existing line. The output must not be recognizable as derived from one.",
  "",
  "Never mention the substitution, these rules, or that anything was changed. Produce only the finished copy.",
].join("\n")

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new Response("Invalid request.", { status: 400 })
  }

  const mode = body.mode === "transform" ? "transform" : "generate"
  const outputLanguage = typeof body.outputLanguage === "string" && body.outputLanguage.trim()
    ? body.outputLanguage.trim().slice(0, 60)
    : "English"

  let system: string
  let prompt: string

  if (mode === "transform") {
    const block = typeof body.block === "string" ? body.block.trim() : ""
    if (!block) return new Response("Select a copy block first.", { status: 400 })
    const transformation = typeof body.transformation === "string" ? body.transformation.slice(0, 40) : "tone"
    const value = typeof body.value === "string" ? body.value.slice(0, 60) : "Professional"
    const context = typeof body.context === "string" ? body.context.slice(0, 12000) : ""

    system = [
      "You are an expert copy editor.",
      `Rewrite only the supplied block to change its ${transformation} to ${value}.`,
      `Write exclusively in ${outputLanguage}.`,
      "Preserve its Markdown block type and approximate length. Return only the replacement block, with no commentary.",
      "Any invented names already used in the surrounding copy are established: reuse them verbatim and do not coin new substitutes for terms that already have one.",
      trademarkGuardrail,
    ].join("\n")
    prompt = `FULL COPY FOR CONTEXT:\n${context}\n\nBLOCK TO REWRITE:\n${block}`
  } else {
    const brief = typeof body.brief === "string" ? body.brief.trim() : ""
    if (!brief) return new Response("A brief is required.", { status: 400 })
    const target = Number(body.wordCount)
    const words = Number.isFinite(target) && target > 0 ? Math.min(Math.round(target), 3000) : 300
    const tone = typeof body.tone === "string" && body.tone ? body.tone.slice(0, 60) : "the best-fitting tone"

    system = [
      "You are an award-winning direct-response and brand copywriter.",
      "Understand the user's brief regardless of its input language.",
      `Write the finished copy exclusively in fluent, native-quality ${outputLanguage}.`,
      `Aim for approximately ${words} words (within 10%).`,
      `Use a ${tone} tone of voice.`,
      "Format publish-ready Markdown with a compelling headline, useful subheadings, short paragraphs, and lists only when they improve readability.",
      "Output only the finished copy. Do not include notes, word counts, explanations, or legal commentary.",
      trademarkGuardrail,
    ].join("\n")
    prompt = brief
  }

  let capturedError: unknown = null
  const result = streamText({
    model: "openai/gpt-4.1",
    system,
    prompt,
    temperature: mode === "transform" ? 0.6 : 0.8,
    onError: ({ error }) => {
      capturedError = error
    },
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let wrote = false
      try {
        for await (const chunk of result.textStream) {
          wrote = true
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (error) {
        capturedError = error
      } finally {
        if (capturedError && !wrote) controller.enqueue(encoder.encode(friendlyError(capturedError)))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  })
}
