/**
 * Writing-style rules injected into every prompt so the model produces clean,
 * plain copy instead of symbol-heavy AI formatting.
 */
export const plainStyleRules = [
  "PLAIN TEXT STYLE RULES",
  "- Write clean, natural prose using only ordinary letters, numbers, and standard punctuation (. , ! ? : ; ' \" - and parentheses).",
  "- Never use emojis, emoticons, icons, arrows, check marks, stars, bullet symbols, or decorative characters.",
  "- Never use em dashes or en dashes. Use a comma, a period, or a new sentence instead.",
  "- Use straight quotes and apostrophes only. Write three periods instead of an ellipsis character.",
  "- Never use bold, italics, underlines, inline code, blockquotes, tables, links, or horizontal rules.",
  "- Never use trademark, registered, or copyright symbols, and never use hashtags unless the brief explicitly asks for social media hashtags.",
  "- Use exclamation marks sparingly, never more than one in a row.",
  "- The only Markdown allowed: one # headline, ## subheadings, and simple lists that start with '- ' or '1. '.",
].join("\n")

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\uFE0F\uFE0E\u200D\u20E3]/gu
const BULLET_SYMBOLS = "•◦‣⁃●○◆◇■□▪▫★☆✦✧❖➤➔➜►▶▸▹✓✔✗✘→⇒⟶"
const LEADING_BULLET = new RegExp(`^(\\s*)[${BULLET_SYMBOLS}]\\s*`, "u")
const DECORATIVE = new RegExp(`[${BULLET_SYMBOLS}←↑↓↔⇐⇨§¶†‡※™®©℠]`, "gu")

function cleanLine(line: string) {
  let next = line

  if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(next)) return ""

  next = next
    .replace(/^\s*>\s?/, "")
    .replace(/^(#{1,6})\s*(.*?)\s*#*\s*$/, (_m, hashes: string, text: string) => `${hashes.length > 2 ? "###" : hashes} ${text}`)
    .replace(LEADING_BULLET, "$1- ")
    .replace(/^(\s*)[*+]\s+/, "$1- ")

  return next
}

/**
 * Deterministically strips the special characters that models tend to
 * sprinkle through copy, while keeping the minimal Markdown structure
 * (headings and lists) the editor relies on.
 */
export function sanitizeCopy(input: string) {
  let text = input.replace(/\r\n?/g, "\n")

  text = text
    .replace(EMOJI, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`+/g, "")
    .replace(/[‘’‚‛′`]/g, "'")
    .replace(/[“”„‟″«»]/g, '"')
    .replace(/…/g, "...")
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1-$2")
    .replace(/(\S)[ \t]*[—―–][ \t]*(?=\S)/g, "$1, ")
    .replace(/[—―]/g, "")
    .replace(/–/g, "-")
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F]/g, " ")

  text = text.split("\n").map(cleanLine).join("\n")

  text = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[^\p{L}\p{N}])_([^_\n]+?)_(?![\p{L}\p{N}])/gu, "$1$2")
    .replace(/\*/g, "")
    .replace(DECORATIVE, "")
    .replace(/!{2,}/g, "!")
    .replace(/\?{2,}/g, "?")

  text = text
    .split("\n")
    .map((line) =>
      line
        .replace(/(\S)[ \t]{2,}/g, "$1 ")
        .replace(/[ \t]+([,.!?;:])/g, "$1")
        .replace(/,\s*,/g, ",")
        .replace(/,([.!?])/g, "$1")
        .replace(/^(#{1,3}|-|\d+\.)\s*$/, "")
        .trimEnd(),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  return text
}

/** Plain-text version for the clipboard: no Markdown heading markers. */
export function toPlainText(markdown: string) {
  return markdown
    .split("\n")
    .map((line) => line.replace(/^#{1,6}\s+/, ""))
    .join("\n")
    .trim()
}
