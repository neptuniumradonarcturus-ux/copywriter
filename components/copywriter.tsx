"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, Loader2, Sparkles, RotateCcw } from "lucide-react"
import { CopyOutput } from "./copy-output"

const TONES = [
  "Auto",
  "Playful",
  "Bold",
  "Warm",
  "Professional",
  "Luxurious",
  "Minimal",
  "Witty",
  "Authoritative",
  "Friendly",
  "Inspirational",
  "Urgent",
] as const

export function Copywriter() {
  const [brief, setBrief] = useState("")
  const [wordCount, setWordCount] = useState(300)
  const [tone, setTone] = useState<(typeof TONES)[number]>("Auto")
  const [output, setOutput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault()
    if (!brief.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    setOutput("")
    setCopied(false)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          wordCount,
          tone: tone === "Auto" ? undefined : tone,
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const message = await res.text().catch(() => "")
        throw new Error(message || "Something went wrong. Please try again.")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setOutput((prev) => prev + decoder.decode(value, { stream: true }))
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Something went wrong. Please try again.")
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-8">
      {/* Input panel */}
      <form onSubmit={handleGenerate} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="brief" className="text-sm font-medium text-foreground">
              Your brief
            </label>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Write in any language → get English copy
            </span>
          </div>
          <textarea
            id="brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
                handleGenerate()
              }
            }}
            placeholder="e.g. Write launch copy for my new DTC coffee brand — single-origin beans, roasted weekly, aimed at busy design-minded professionals."
            rows={7}
            className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <p className="text-xs text-muted-foreground">
            Tip: press{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">⌘/Ctrl</kbd> +{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to
            generate.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="words" className="text-sm font-medium text-foreground">
              Word count
            </label>
            <span className="tabular-nums text-sm font-semibold text-primary">{wordCount}</span>
          </div>
          <input
            id="words"
            type="range"
            min={50}
            max={1500}
            step={50}
            value={wordCount}
            onChange={(e) => setWordCount(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50</span>
            <span>1500</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Tone of voice</span>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  tone === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-ring hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={!brief.trim() || isLoading} className="mt-1 h-11 gap-2 text-sm font-medium">
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Writing…
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Generate copy
            </>
          )}
        </Button>
      </form>

      {/* Output panel */}
      <div className="flex min-h-[420px] flex-col rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-foreground">Output</h2>
            {wordsWritten > 0 && (
              <span className="tabular-nums rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {wordsWritten} words
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {output && !isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleGenerate()}
                className="h-8 gap-1.5 text-xs"
              >
                <RotateCcw className="size-3.5" />
                Regenerate
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!output}
              className="h-8 gap-1.5 text-xs"
            >
              {copied ? (
                <>
                  <Check className="size-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-6">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : output ? (
            <CopyOutput markdown={output} />
          ) : isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Crafting your copy…
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Sparkles className="size-5 text-muted-foreground" />
              </div>
              <p className="max-w-xs text-sm text-muted-foreground text-pretty">
                Your polished copy will appear here. Describe what you need and set a word count to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
