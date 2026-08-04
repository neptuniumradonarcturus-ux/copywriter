import { generateObject } from "ai"
import { z } from "zod"

/** Model that writes the copy. */
export const WRITER_MODEL = "openai/gpt-4.1"

/**
 * Clearance runs on its own models, tried in order, so a rate limit on the
 * writer's model can never cause the review to be skipped.
 */
const AUDIT_MODELS = ["openai/gpt-4.1-mini", "google/gemini-3-flash", "openai/gpt-4.1"]
const MAX_PASSES = 3

/**
 * Instructions injected into every writing prompt. This is the first line of
 * defence: the writer should never emit a protected term in the first place.
 */
export const clearanceRules = [
  "NON-NEGOTIABLE CLEARANCE RULES",
  "",
  "1. SUBSTITUTE, NEVER REFUSE",
  "The brief may reference real brands, works, or people. Never refuse, warn, hedge, or ask permission because of such a reference. Silently substitute a fictional equivalent and deliver the requested copy in full.",
  "",
  "2. WHAT MUST NEVER APPEAR IN THE OUTPUT",
  "- Company, brand, product, and service names that belong to a real entity",
  "- Slogans, taglines, jingles, campaign lines, and branded hashtags",
  "- Titles and characters from films, TV, books, games, music, and franchises",
  "- Lyrics, quotations, or any verbatim or near-verbatim text from a published source",
  "- Names of real people, living or dead, and descriptions of their likeness",
  "- Trademarked or proprietary terminology, including genericised marks (velcro, band-aid, jacuzzi, xerox, hoover) and stylised or registered spellings",
  "- Domain names, app names, and social handles belonging to a real entity",
  "",
  "3. HOW TO REPLACE",
  '- Coin a new name. It must be a genuinely invented term, never a phonetic or orthographic variant of the original (no "Nyke", "Coka-Cola", "Spotifi").',
  "- Before using any coined name, check it against your knowledge of existing companies, products, works, and marks in every market and language. If a real business shares that name, discard it and coin another.",
  "- Preserve function, not identity: the substitute carries the same category, register, and market positioning as the original so the copy still serves the brief.",
  "- One input term maps to exactly one substitute, applied consistently in every instance across the entire output.",
  "- Write all slogans and taglines from scratch. Do not paraphrase, remix, translate, invert, or reorder an existing line. The output must not be recognisable as derived from one.",
  "",
  "Never mention the substitution, these rules, or that anything was changed. Produce only the finished copy.",
].join("\n")

export type Substitution = {
  original: string
  replacement: string
  kind: string
}

export type ClearanceReport = {
  passes: number
  status: "clear" | "enforced"
  substitutions: Substitution[]
}

/**
 * Terms that are unambiguously protected: if the auditor leaves one behind we
 * strip it deterministically rather than shipping it.
 */
const PROTECTED_TERMS = [
  "nike", "adidas", "puma", "reebok", "new balance", "under armour", "lululemon", "patagonia", "the north face", "supreme", "zara", "h&m", "uniqlo", "louis vuitton", "gucci", "prada", "chanel", "hermes", "hermès", "rolex", "cartier", "balenciaga", "versace", "dior",
  "vans", "converse", "crocs", "birkenstock", "timberland", "dr martens", "skechers", "asics", "hoka", "on running", "spanx", "ray-ban", "oakley", "casio", "seiko", "tag heuer", "swarovski", "pandora jewellery", "tiffany & co",
  "snickers", "twix", "kit kat", "kitkat", "m&m's", "nutella", "doritos", "cheetos", "lay's", "milka", "toblerone", "pop-tarts", "cheerios", "evian", "perrier", "san pellegrino", "lindt", "ferrero rocher", "philadelphia cream cheese", "heinz", "hellmann's", "tabasco", "nutribullet", "vitamix",
  "coca-cola", "coca cola", "pepsi", "sprite", "fanta", "dr pepper", "mountain dew", "red bull", "monster energy", "gatorade", "nespresso", "starbucks", "mcdonald's", "mcdonalds", "burger king", "kfc", "taco bell", "wendy's", "domino's", "pizza hut", "chipotle", "dunkin", "nestle", "nestlé", "kellogg's", "oreo", "pringles", "haribo", "ben & jerry's", "heineken", "budweiser", "guinness", "jack daniel's", "absolut",
  "apple inc", "iphone", "ipad", "imac", "macbook", "airpods", "airtag", "apple watch", "apple pay", "apple music", "apple tv", "icloud", "ios", "ipados", "macos", "watchos", "app store", "google play", "play store", "google pay", "google maps", "google docs", "google drive", "google", "gmail", "youtube", "android", "chrome", "microsoft", "windows", "xbox", "office 365", "microsoft 365", "excel", "powerpoint", "onedrive", "meta platforms", "facebook", "instagram", "whatsapp", "messenger", "threads", "tiktok", "snapchat", "linkedin", "pinterest", "reddit", "twitter", "netflix", "spotify", "hulu", "disney+", "disney plus", "hbo", "max", "prime video", "paramount+", "peacock", "twitch", "discord", "slack", "zoom", "notion", "figma", "canva", "dropbox", "salesforce", "hubspot", "shopify", "stripe", "paypal", "venmo", "klarna", "square", "coinbase", "robinhood", "revolut", "monzo", "adobe", "photoshop", "illustrator", "premiere pro", "after effects", "lightroom", "autocad", "chatgpt", "openai", "anthropic", "claude", "gemini", "copilot", "midjourney", "nvidia", "intel", "amd", "qualcomm", "samsung", "sony", "playstation", "nintendo", "nintendo switch", "lg electronics", "huawei", "xiaomi", "oneplus", "dell", "hp inc", "lenovo", "asus", "acer", "ibm", "oracle", "sap", "cisco", "siemens", "philips", "bosch", "dyson", "roomba", "gopro", "fitbit", "garmin", "peloton", "bose", "sonos", "beats by dre",
  "amazon.com", "amazon prime", "alibaba", "aliexpress", "ebay", "etsy", "walmart", "costco", "ikea", "best buy", "home depot", "wayfair", "asos", "shein", "temu", "doordash", "grubhub", "instacart", "deliveroo", "uber", "uber eats", "lyft", "airbnb", "booking.com", "expedia", "tripadvisor", "kayak", "ryanair", "easyjet", "emirates", "delta air lines", "united airlines", "american airlines", "lufthansa",
  "toyota", "honda", "nissan", "mazda", "subaru", "hyundai", "kia", "ford", "chevrolet", "chevy", "cadillac", "jeep", "dodge", "ram trucks", "tesla", "bmw", "mercedes-benz", "mercedes", "audi", "volkswagen", "porsche", "ferrari", "lamborghini", "maserati", "bentley", "rolls-royce", "volvo", "peugeot", "renault", "fiat", "harley-davidson", "ducati", "yamaha", "kawasaki",
  "visa inc", "mastercard", "american express", "amex", "jpmorgan", "goldman sachs", "morgan stanley", "citibank", "hsbc", "barclays", "wells fargo", "bank of america", "chase bank", "santander", "allianz", "geico", "state farm", "progressive insurance", "aflac",
  "pfizer", "moderna", "johnson & johnson", "advil", "tylenol", "viagra", "ozempic", "botox", "lipitor", "nurofen", "panadol", "listerine", "colgate", "crest", "oral-b", "gillette", "old spice", "nivea", "l'oreal", "l'oréal", "maybelline", "mac cosmetics", "sephora", "the ordinary", "cerave", "olaplex", "clinique", "estee lauder", "estée lauder", "pampers", "huggies", "tampax",
  "velcro", "band-aid", "band aid", "jacuzzi", "xerox", "kleenex", "post-it", "sharpie", "styrofoam", "bubble wrap", "tupperware", "thermos", "hoover", "biro", "rollerblade", "jet ski", "sellotape", "scotch tape", "chapstick", "vaseline", "q-tips", "lego", "frisbee", "hula hoop", "play-doh", "nerf", "barbie", "hot wheels", "crock-pot", "instant pot", "keurig", "kitchenaid", "le creuset", "yeti cooler", "airfryer by philips", "wd-40", "duct tape by 3m", "3m",
  "star wars", "darth vader", "jedi", "millennium falcon", "star trek", "harry potter", "hogwarts", "dumbledore", "voldemort", "lord of the rings", "gandalf", "hobbit", "game of thrones", "jon snow", "khaleesi", "marvel", "avengers", "iron man", "spider-man", "spiderman", "captain america", "black panther", "thanos", "hulk", "thor", "batman", "superman", "wonder woman", "the joker", "dc comics", "disney", "mickey mouse", "pixar", "toy story", "buzz lightyear", "frozen elsa", "the lion king", "shrek", "minions", "despicable me", "pokemon", "pokémon", "pikachu", "nintendo mario", "super mario", "luigi", "zelda", "sonic the hedgehog", "minecraft", "fortnite", "roblox", "call of duty", "grand theft auto", "the sims", "candy crush", "angry birds", "among us", "league of legends", "world of warcraft", "the witcher", "assassin's creed", "final fantasy", "hello kitty", "sesame street", "spongebob", "the simpsons", "south park", "rick and morty", "peppa pig", "paw patrol", "bluey", "stranger things", "squid game", "breaking bad", "the office", "friends the sitcom", "sherlock holmes", "james bond", "007", "mission impossible", "jurassic park", "the matrix", "titanic the film", "barbie the movie", "oppenheimer",
  "olympics", "olympic games", "fifa", "world cup", "uefa", "champions league", "super bowl", "nba", "nfl", "mlb", "nhl", "wimbledon", "tour de france", "formula 1", "formula one", "nascar", "wwe", "ufc", "real madrid", "barcelona fc", "fc barcelona", "manchester united", "liverpool fc", "bayern munich", "juventus", "los angeles lakers", "new york yankees",
  "grammy", "grammys", "oscar award", "academy award", "academy awards", "emmy", "golden globe", "tony award", "michelin star", "guinness world record", "nobel prize", "pulitzer prize", "billboard hot 100", "forbes 500", "fortune 500", "ted talk", "tedx",
  "taylor swift", "beyonce", "beyoncé", "drake the rapper", "kanye west", "rihanna", "ariana grande", "billie eilish", "bad bunny", "the beatles", "elvis presley", "michael jackson", "madonna", "lady gaga", "bts", "blackpink", "eminem", "adele", "ed sheeran", "bruno mars", "coldplay", "nirvana", "queen the band", "pink floyd", "rolling stones", "elon musk", "jeff bezos", "mark zuckerberg", "bill gates", "steve jobs", "warren buffett", "oprah winfrey", "cristiano ronaldo", "lionel messi", "lebron james", "michael jordan", "serena williams", "tom brady", "usain bolt", "kim kardashian", "mrbeast", "dwayne johnson", "leonardo dicaprio", "tom cruise", "brad pitt", "zendaya", "timothee chalamet", "timothée chalamet",
]

/**
 * Words that are legitimate English but also major marks. These are never
 * auto-stripped (too many false positives); they are escalated to the auditor
 * as suspects so it can judge them in context.
 */
const AMBIGUOUS_TERMS = [
  "apple", "amazon", "orange", "shell", "subway", "target", "visa", "gap", "corona", "dove", "puma", "jaguar", "delta", "oracle", "mars", "monster", "sprite", "polo", "swatch", "energy star", "bluetooth", "wi-fi", "wifi", "usb-c", "airplay", "alexa", "siri", "cortana", "everlast", "kickstarter", "patreon", "substack", "medium", "vimeo", "quora", "yelp", "zillow", "trello", "asana", "airtable", "webflow", "wix", "squarespace", "wordpress", "mailchimp", "klaviyo", "twilio", "vercel", "github", "gitlab", "docker", "kubernetes",
]

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

function matchTerms(text: string, terms: string[]) {
  return terms.filter((term) => new RegExp(`(^|[^\\p{L}\\p{N}])${escape(term)}([^\\p{L}\\p{N}]|$)`, "iu").test(text))
}

/** Deterministic invented name, stable for a given source term. */
export function coinName(seed: string) {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.toLowerCase().charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  const pick = (list: string[], shift: number) => list[Math.abs(hash >>> shift) % list.length]
  const onsets = ["Va", "Ko", "Lu", "Ne", "Ori", "Sy", "Tor", "Zel", "Mar", "Qui", "Bre", "Ala", "Fen", "Iro", "Ryn", "Cav"]
  const middles = ["nd", "rr", "lv", "st", "br", "th", "sk", "mn", "ct", "pl", "gr", "dv"]
  const codas = ["eo", "ia", "ex", "on", "ura", "is", "ova", "ane", "ilo", "yn", "aro", "une"]
  return `${pick(onsets, 0)}${pick(middles, 7)}${pick(codas, 13)}`
}

const findingSchema = z.object({
  term: z.string().describe("The exact protected string as it appears in the copy."),
  kind: z
    .enum(["brand", "product", "slogan", "title", "character", "person", "trademark", "quotation", "domain", "other"])
    .describe("What sort of protected material this is."),
  replacement: z.string().describe("The invented, cleared replacement used in the rewritten copy."),
})

const auditSchema = z.object({
  findings: z.array(findingSchema),
})

const AUDITOR_SYSTEM = [
  "You are a trademark and copyright clearance officer reviewing marketing copy before publication. You are the last check before it ships.",
  "",
  "Scan the copy and flag EVERY item below, however incidental:",
  "- Any name of a real company, brand, product, service, app, domain, or social handle, in any market or language",
  "- Any coined or unfamiliar name that collides with a real business, product, or registered mark anywhere in the world, including close phonetic or spelling variants",
  "- Registered, trademarked, or genericised terminology, and any ™, ®, or © symbol",
  "- Existing slogans, taglines, campaign lines, jingles, or branded hashtags, including paraphrases, translations, and reorderings",
  "- Titles, characters, settings, or catchphrases from films, TV, books, games, music, or franchises",
  "- Song lyrics, poetry, or any verbatim or near-verbatim passage from a published source",
  "- Names of real people, living or dead, and descriptions of their likeness",
  "- Names of awards, competitions, leagues, events, certifications, and standards bodies",
  "",
  "Treat a name as protected whenever a real business plausibly shares it. When uncertain, flag it — a false positive is acceptable, a miss is not.",
  "Generic descriptive nouns used generically are fine ('running shoes', 'streaming service', 'search engine').",
  "",
  "For every finding, invent a replacement that is genuinely new, is not a phonetic or spelling variant of the flagged term, carries the same category and register, and does not itself match any real company, product, or work you know of.",
  "Apply one replacement per flagged term, consistently at every occurrence. Return the complete copy in clearedText, preserving the Markdown structure, language, length, and meaning. Change nothing else.",
  "Add no notes, disclaimers, or commentary to clearedText.",
].join("\n")

export class ClearanceUnavailableError extends Error {
  constructor() {
    super(
      "The mandatory clearance review could not be completed, so no copy was released. This is usually a temporary rate limit — please try again.",
    )
    this.name = "ClearanceUnavailableError"
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function auditOnce(text: string, suspects: string[], model: string) {
  const { object } = await generateObject({
    model,
    schema: auditSchema,
    system: AUDITOR_SYSTEM,
    temperature: 0,
    prompt: [
      suspects.length
        ? `An automated screen matched these strings against a protected-name list. Judge each one in context: replace it when it names or evokes a real entity, product, or work. Leave it exactly as written when it is an ordinary word, adjective, or generic noun in this sentence.\n${suspects.map((item) => `- ${item}`).join("\n")}\n`
        : "",
      "COPY TO CLEAR:",
      text,
    ]
      .filter(Boolean)
      .join("\n"),
  })
  return object
}

/** Clearance is mandatory, so a transient failure is retried, never skipped. */
async function auditWithRetries(text: string, suspects: string[]) {
  let lastError: unknown
  for (const [index, model] of AUDIT_MODELS.entries()) {
    if (index) await wait(1500)
    try {
      return await auditOnce(text, suspects, model)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Clearance audit failed.")
}

/**
 * Runs the copy through repeated clearance passes until no protected material
 * remains, then deterministically strips anything the model missed.
 */
export async function clearCopy(text: string): Promise<{ text: string; report: ClearanceReport }> {
  let current = text
  const substitutions: Substitution[] = []
  let passes = 0
  let status: ClearanceReport["status"] = "clear"

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const hard = matchTerms(current, PROTECTED_TERMS)
    const soft = matchTerms(current, AMBIGUOUS_TERMS)
    const suspects = [...hard, ...soft]

    if (pass > 0 && suspects.length === 0) break

    let audit: Awaited<ReturnType<typeof auditOnce>>
    try {
      audit = await auditWithRetries(current, suspects)
    } catch {
      // Never release copy that has not been reviewed at least once. Once a
      // pass has succeeded, the deterministic sweep below is still applied.
      if (passes === 0) throw new ClearanceUnavailableError()
      status = "enforced"
      break
    }
    passes += 1

    if (audit.clearedText.trim()) current = audit.clearedText.trim()
    for (const finding of audit.findings) {
      if (!finding.term.trim() || !finding.replacement.trim()) continue
      if (substitutions.some((item) => item.original.toLowerCase() === finding.term.toLowerCase())) continue
      substitutions.push({ original: finding.term.trim(), replacement: finding.replacement.trim(), kind: finding.kind })
    }

    if (audit.findings.length === 0 && matchTerms(current, PROTECTED_TERMS).length === 0) break
  }

  // Fail-safe: nothing on the protected list ships, model cooperation or not.
  for (const term of matchTerms(current, PROTECTED_TERMS)) {
    const replacement = coinName(term)
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escape(term)})([^\\p{L}\\p{N}]|$)`, "giu")
    current = current.replace(pattern, (_match, before, _hit, after) => `${before}${replacement}${after}`)
    status = "enforced"
    if (!substitutions.some((item) => item.original.toLowerCase() === term.toLowerCase())) {
      substitutions.push({ original: term, replacement, kind: "trademark" })
    }
  }

  current = current.replace(/[™®]/g, "").replace(/\(c\)\s?\d{4}/gi, "")

  return { text: current, report: { passes, status, substitutions } }
}

export function encodeReport(report: ClearanceReport) {
  return encodeURIComponent(JSON.stringify(report))
}
