"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Check, Copy, Languages, Loader2, RotateCcw, Sparkles, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CopyOutput, splitMarkdownBlocks } from "./copy-output"
import { LanguagePicker } from "./language-picker"

const TONES = ["Auto", "Playful", "Bold", "Warm", "Professional", "Luxurious", "Minimal", "Witty", "Authoritative", "Friendly"] as const
const EDIT_TONES = ["Professional", "Conversational", "Bold", "Luxurious", "Witty"]
const EMOTIONS = ["Excited", "Reassuring", "Curious", "Empathetic", "Urgent"]

export function Copywriter() {
  const [brief, setBrief] = useState("")
  const [wordCount, setWordCount] = useState(300)
  const [tone, setTone] = useState<(typeof TONES)[number]>("Auto")
  const [outputLanguage, setOutputLanguage] = useState("English")
  const [output, setOutput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTransforming, setIsTransforming] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function readStream(response: Response) {
    if (!response.ok || !response.body) throw new Error((await response.text()) || "Something went wrong. Please try again.")
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let text = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
    }
    return text
  }

  async function handleGenerate(event?: React.FormEvent) {
    event?.preventDefault()
    if (!brief.trim() || isLoading) return
    setIsLoading(true)
    setError(null)
    setOutput("")
    setSelectedIndex(null)
    setCopied(false)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, wordCount, outputLanguage, tone: tone === "Auto" ? undefined : tone }),
        signal: controller.signal,
      })
      setOutput(await readStream(response))
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") setError((caught as Error).message)
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }

  async function transformBlock(transformation: "tone" | "emotion" | "language", value: string) {
    if (selectedIndex === null || isTransforming) return
    const blocks = splitMarkdownBlocks(output)
    const block = blocks[selectedIndex]
    if (!block) return
    setIsTransforming(true)
    setError(null)
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "transform", block, context: output, transformation, value, outputLanguage: transformation === "language" ? value : outputLanguage }),
      })
      const replacement = (await readStream(response)).trim()
      if (replacement) {
        blocks[selectedIndex] = replacement
        setOutput(blocks.join("\n\n"))
        if (transformation === "language") setOutputLanguage(value)
      }
    } catch (caught) {
      setError((caught as Error).message)
    } finally {
      setIsTransforming(false)
    }
  }

  function handleCopy() {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const wordsWritten = output.trim() ? output.trim().split(/\s+/).length : 0

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-8">
      <form onSubmit={handleGenerate} className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="brief" className="text-sm font-semibold text-foreground">Your brief</label>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Any input language</span>
          </div>
          <textarea
            id="brief"
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing && event.keyCode !== 229) handleGenerate()
            }}
            placeholder="Describe the audience, offer, channel, and outcome you need. Write in any language."
            rows={7}
            className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">Real brand and trademark names are automatically replaced with fictional alternatives.</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="words" className="text-sm font-semibold">Word count</label>
            <span className="rounded-md bg-primary/10 px-2 py-1 text-sm font-semibold tabular-nums text-primary">{wordCount}</span>
          </div>
          <input id="words" type="range" min={50} max={1500} step={50} value={wordCount} onChange={(event) => setWordCount(Number(event.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary" />
          <div className="flex justify-between text-xs text-muted-foreground"><span>50</span><span>1,500</span></div>
        </div>

        <LanguagePicker value={outputLanguage} onChange={setOutputLanguage} />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Tone of voice</span>
          <div className="flex flex-wrap gap-2">
            {TONES.map((item) => (
              <button key={item} type="button" onClick={() => setTone(item)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${tone === item ? "border-[var(--human)] bg-[var(--human)] text-[var(--human-foreground)]" : "border-border bg-background text-muted-foreground hover:border-[var(--human)] hover:text-foreground"}`}>{item}</button>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={!brief.trim() || isLoading} className="h-11 gap-2 text-sm font-semibold">
          {isLoading ? <><Loader2 className="size-4 animate-spin" />Writing copy…</> : <><Sparkles className="size-4" />Generate copy</>}
        </Button>
      </form>

      <section aria-label="Generated copy" className="flex min-h-[520px] flex-col overflow-visible rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Generated copy</h2>
            {wordsWritten > 0 && <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground tabular-nums">{wordsWritten} words</span>}
          </div>
          <div className="flex items-center gap-2">
            {output && !isLoading && <Button type="button" variant="ghost" size="sm" onClick={() => handleGenerate()} className="h-9 gap-1.5 text-xs"><RotateCcw className="size-3.5" />Regenerate</Button>}
            <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={!output} className="h-9 gap-1.5 text-xs">{copied ? <><Check className="size-3.5" />Copied</> : <><Copy className="size-3.5" />Copy</>}</Button>
          </div>
        </div>

        {output && selectedIndex !== null && (
          <div className="flex flex-col gap-3 border-b border-border bg-muted/50 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2"><WandSparkles className="size-4 text-primary" /><p className="text-xs font-semibold text-foreground">Edit selected block</p>{isTransforming && <Loader2 className="size-3.5 animate-spin text-primary" />}</div>
            <div className="flex flex-wrap gap-2">
              {EDIT_TONES.map((item) => <button key={item} type="button" disabled={isTransforming} onClick={() => transformBlock("tone", item)} className="rounded-full border border-[var(--human)] bg-[var(--human)]/25 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-[var(--human)]">{item}</button>)}
            </div>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map((item) => <button key={item} type="button" disabled={isTransforming} onClick={() => transformBlock("emotion", item)} className="rounded-full border border-[var(--human)] px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-[var(--human)]/40">{item}</button>)}
              <div className="min-w-48"><LanguagePicker compact label="Translate selected block" value={outputLanguage} onChange={(language) => transformBlock("language", language)} /></div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto px-3 py-4 sm:px-5 sm:py-6">
          {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm leading-relaxed text-destructive">{error}</p> : output ? <CopyOutput markdown={output} selectedIndex={selectedIndex} onSelect={setSelectedIndex} /> : isLoading ? <div className="flex items-center gap-2 px-3 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Crafting your copy…</div> : <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center"><div className="flex size-12 items-center justify-center rounded-xl bg-primary/10"><Languages className="size-5 text-primary" /></div><div className="flex max-w-sm flex-col gap-2"><p className="text-sm font-semibold">Ready when you are</p><p className="text-sm leading-relaxed text-muted-foreground">Set your brief, language, word count, and tone. Click any generated paragraph to refine it.</p></div></div>}
        </div>
      </section>
    </div>
  )
}
