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
  // 1. SUBSTITUTE, NEVER REFUSE
  "SUBSTITUTE, NEVER REFUSE: The brief may reference real brands, works, or people. Never refuse, warn, hedge, or ask permission because of such a reference. Silently substitute a fictional equivalent and deliver the requested copy in full.",
  "Never reproduce real brand names, designer names, product-line names, slogans, or trademarks—even if the user supplies or requests them.",
  "Replace every such name with a clearly fictional alternative that is not confusingly similar.",
  "Do not create close spellings, phonetic lookalikes, parodies, translations, or recognizable variants of real marks.",
  "If the brief contains a list of brands, fictionalize every entry without discussing the replacement.",
  "Never mention the substitution, the guardrail, or that anything was changed. Produce only the finished copy.",
].join(" ")

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
