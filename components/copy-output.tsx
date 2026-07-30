"use client"

import Markdown from "react-markdown"

export function splitMarkdownBlocks(markdown: string) {
  return markdown.trim().split(/\n\s*\n/).filter(Boolean)
}

export function CopyOutput({
  markdown,
  selectedIndex,
  onSelect,
}: {
  markdown: string
  selectedIndex: number | null
  onSelect: (index: number) => void
}) {
  const blocks = splitMarkdownBlocks(markdown)

  return (
    <div className="max-w-prose text-foreground">
      {blocks.map((block, index) => (
        <button
          key={`${index}-${block.slice(0, 24)}`}
          type="button"
          aria-pressed={selectedIndex === index}
          onClick={() => onSelect(index)}
          className={`group mb-2 block w-full rounded-lg border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/30 ${
            selectedIndex === index
              ? "border-primary bg-primary/5"
              : "border-transparent hover:border-border hover:bg-muted/60"
          }`}
        >
          <Markdown
            components={{
              h1: ({ children }) => <h1 className="text-3xl font-semibold leading-tight text-balance md:text-4xl">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-semibold leading-snug text-balance md:text-2xl">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-semibold">{children}</h3>,
              p: ({ children }) => <p className="text-sm leading-relaxed text-foreground/90">{children}</p>,
              ul: ({ children }) => <ul className="ml-5 list-disc text-sm leading-relaxed">{children}</ul>,
              ol: ({ children }) => <ol className="ml-5 list-decimal text-sm leading-relaxed">{children}</ol>,
              li: ({ children }) => <li className="text-foreground/90 marker:text-muted-foreground">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-primary pl-4 text-sm italic text-muted-foreground">{children}</blockquote>,
              hr: () => <hr className="border-border" />,
              a: ({ children, href }) => <span className="text-primary underline underline-offset-2" data-href={href}>{children}</span>,
            }}
          >
            {block}
          </Markdown>
          <span className={`mt-2 block text-xs font-semibold ${selectedIndex === index ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100"}`}>
            {selectedIndex === index ? "Selected for editing" : "Click to edit this block"}
          </span>
        </button>
      ))}
    </div>
  )
}
