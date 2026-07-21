"use client"

import Markdown from "react-markdown"

export function CopyOutput({ markdown }: { markdown: string }) {
  return (
    <div className="max-w-prose text-foreground">
      <Markdown
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 mt-2 font-serif text-3xl font-normal leading-tight text-balance">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-6 font-serif text-xl font-normal leading-snug text-balance">{children}</h2>
          ),
          h3: ({ children }) => <h3 className="mb-2 mt-5 text-base font-semibold">{children}</h3>,
          p: ({ children }) => <p className="mb-4 text-sm leading-relaxed text-foreground/90">{children}</p>,
          ul: ({ children }) => <ul className="mb-4 ml-5 list-disc space-y-1.5 text-sm leading-relaxed">{children}</ul>,
          ol: ({ children }) => (
            <ol className="mb-4 ml-5 list-decimal space-y-1.5 text-sm leading-relaxed">{children}</ol>
          ),
          li: ({ children }) => <li className="text-foreground/90 marker:text-muted-foreground">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-primary pl-4 text-sm italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-border" />,
          a: ({ children, href }) => (
            <a href={href} className="text-primary underline underline-offset-2">
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </Markdown>
    </div>
  )
}
