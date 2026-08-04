"use client"

import { useState } from "react"
import { ChevronDown, ShieldCheck } from "lucide-react"
import type { ClearanceReport } from "@/lib/clearance"

const KIND_LABELS: Record<string, string> = {
  brand: "Brand name",
  product: "Product name",
  slogan: "Slogan",
  title: "Work title",
  character: "Character",
  person: "Real person",
  trademark: "Trademark",
  quotation: "Quoted text",
  domain: "Domain or handle",
  other: "Protected term",
}

export function ClearancePanel({ report }: { report: ClearanceReport }) {
  const [open, setOpen] = useState(false)
  const count = report.substitutions.length

  return (
    <div className="border-b border-border bg-[var(--human)]/15 px-5 py-3 sm:px-6">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 text-left"
      >
        <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-xs font-semibold text-foreground">Clearance check passed</span>
          <span className="text-xs text-muted-foreground">
            {count === 0
              ? "No protected names found in this copy."
              : `${count} protected ${count === 1 ? "name was" : "names were"} replaced with invented alternatives.`}
          </span>
        </span>
        {count > 0 && (
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        )}
      </button>

      {open && count > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {report.substitutions.map((item) => (
            <li
              key={`${item.original}-${item.replacement}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-background px-3 py-2 text-xs"
            >
              <span className="font-semibold text-muted-foreground line-through">{item.original}</span>
              <span className="text-muted-foreground" aria-hidden="true">
                →
              </span>
              <span className="font-semibold text-foreground">{item.replacement}</span>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 font-semibold text-muted-foreground">
                {KIND_LABELS[item.kind] ?? "Protected term"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
