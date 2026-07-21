import { Copywriter } from "@/components/copywriter"
import { PenLine } from "lucide-react"

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
        <header className="mb-10 flex flex-col gap-4 md:mb-14">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <PenLine className="size-4 text-primary" />
            Copywriter
          </div>
          <h1 className="max-w-2xl font-serif text-4xl font-normal leading-tight text-balance md:text-5xl">
            Write brilliant copy in seconds.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground text-pretty">
            Describe what you need, set a word count, and get polished, perfectly formatted copy ready to ship.
          </p>
        </header>

        <Copywriter />
      </div>
    </main>
  )
}
