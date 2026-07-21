import { streamText } from "ai"

// Copywriting generation endpoint (streaming)
export const maxDuration = 60

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (/credit card|customer_verification/i.test(message)) {
    return "⚠️ The AI Gateway needs a credit card on file before it can generate any copy (you keep your free credits — the card is just for verification). Open the Vercel dashboard → AI → Add credit card, then try again."
  }
  if (/api key|unauthorized|401|AI_GATEWAY_API_KEY/i.test(message)) {
    return "⚠️ The AI Gateway isn't authenticated yet. Add the Vercel AI Gateway integration (or an AI_GATEWAY_API_KEY), then try again."
  }
  return `⚠️ ${message || "Something went wrong while generating your copy. Please try again."}`
}

export async function POST(req: Request) {
  const { brief, wordCount, tone } = await req.json()

  if (!brief || typeof brief !== "string" || !brief.trim()) {
    return new Response("A brief is required.", { status: 400 })
  }

  const target = Number(wordCount)
  const words = Number.isFinite(target) && target > 0 ? Math.min(Math.round(target), 3000) : 300

  const system = [
    "You are an award-winning direct-response and brand copywriter.",
    "Write clean, publish-ready copy based on the user's brief.",
    "Rules:",
    "- The brief may be written in ANY language. ALWAYS write the finished copy in fluent, native-quality English, regardless of the language of the brief.",
    `- Aim for approximately ${words} words (within ~10%).`,
    "- Format the output beautifully in Markdown: use a compelling headline (#), subheadings (##) where helpful, short paragraphs, and bullet lists when they improve readability.",
    "- Do not include meta commentary, notes, word counts, or explanations about the copy — output only the finished copy itself.",
    tone ? `- Tone of voice: ${tone}.` : "- Choose a tone of voice that best fits the brief.",
  ].join("\n")

  // streamText's onError callback swallows the thrown error (so the text
  // iterator would otherwise just end silently). Capture it here so we can
  // surface it as visible text in the response body.
  let capturedError: unknown = null

  const result = streamText({
    model: "openai/gpt-4.1",
    system,
    prompt: brief,
    temperature: 0.8,
    onError: ({ error }) => {
      capturedError = error
      console.error("[v0] streamText error:", error)
    },
  })

  // Manually pump the text stream so that any error (e.g. the gateway
  // rejecting the request) is surfaced as visible text in the response body
  // instead of silently returning an empty 200.
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let wrote = false
      try {
        for await (const chunk of result.textStream) {
          wrote = true
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (err) {
        capturedError = err
      } finally {
        if (capturedError && !wrote) {
          controller.enqueue(encoder.encode(friendlyError(capturedError)))
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  })
}
