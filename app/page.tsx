import { Copywriter } from "@/components/copywriter"
import { PenTool } from "lucide-react"

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-14">
        <header className="mb-10 flex flex-col gap-5 md:mb-12">
          <div className="flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
            <PenTool className="size-4" />
            Expert Copywriter
          </div>
          <div className="flex max-w-3xl flex-col gap-4">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">
              One brief. Any language. Expert copy.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty md:text-lg">
              Shape publish-ready marketing copy with precise word count, tone, emotion, and output-language controls—then refine any paragraph without starting over.
            </p>
          </div>
        </header>
        <Copywriter />
      </div>
    </main>
  )
}
