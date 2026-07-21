"use client"

import { useId, useMemo, useState } from "react"
import { Check, ChevronDown, Search } from "lucide-react"

export const LANGUAGES = [
  "Arabic", "Bengali", "Bulgarian", "Catalan", "Chinese (Simplified)", "Chinese (Traditional)",
  "Croatian", "Czech", "Danish", "Dutch", "English", "Estonian", "Finnish", "French", "German",
  "Greek", "Hebrew", "Hindi", "Hungarian", "Indonesian", "Italian", "Japanese", "Korean", "Latvian",
  "Lithuanian", "Malay", "Norwegian", "Persian", "Polish", "Portuguese", "Romanian", "Russian",
  "Serbian", "Slovak", "Slovenian", "Spanish", "Swahili", "Swedish", "Tagalog", "Tamil", "Telugu",
  "Thai", "Turkish", "Ukrainian", "Urdu", "Vietnamese",
]

export function LanguagePicker({
  value,
  onChange,
  label = "Output language",
  compact = false,
}: {
  value: string
  onChange: (value: string) => void
  label?: string
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const id = useId()
  const filtered = useMemo(
    () => LANGUAGES.filter((language) => language.toLowerCase().includes(query.toLowerCase())),
    [query],
  )

  return (
    <div className="relative flex flex-col gap-2">
      {!compact && <label htmlFor={id} className="text-sm font-semibold text-foreground">{label}</label>}
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center justify-between gap-3 rounded-lg border border-input bg-background text-left text-sm text-foreground transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 ${compact ? "h-9 px-3" : "h-11 px-4"}`}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full min-w-56 rounded-xl border border-border bg-popover p-2 shadow-lg">
          <div className="flex items-center gap-2 rounded-lg border border-input px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false)
              }}
              placeholder="Search languages"
              aria-label="Search languages"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div role="listbox" aria-label={label} className="mt-2 max-h-56 overflow-y-auto">
            {filtered.map((language) => (
              <button
                key={language}
                type="button"
                role="option"
                aria-selected={language === value}
                onClick={() => {
                  onChange(language)
                  setOpen(false)
                  setQuery("")
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
              >
                {language}
                {language === value && <Check className="size-4 text-primary" />}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-4 text-center text-sm text-muted-foreground">No language found</p>}
          </div>
        </div>
      )}
    </div>
  )
}
