// Helpers that turn raw PDF text into readable passages and find the sentences an answer relies on.

const TOKEN = /[a-z0-9]+(?:[-_.][a-z0-9]+)*/g
const COMMON = new Set(
  'a an and are as at be but by can for from has have if in into is it its may must not of on or so that the their them then there these they this to was were will with you your per each any all'.split(' '),
)

function words(text: string): Set<string> {
  return new Set((text.toLowerCase().match(TOKEN) ?? []).filter((w) => !COMMON.has(w)))
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Answer text that cites each source number, with the [n] markers removed. */
export function supportByRef(answer: string): Map<number, string> {
  const out = new Map<number, string>()
  // Uncited sentences are attributed to the next citation, as models often cite once per pair.
  let pending = ''
  for (const sentence of splitSentences(answer.replace(/\n- /g, ' '))) {
    const refs = [...sentence.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]))
    const clean = `${pending} ${sentence.replace(/\[\d+\]/g, '')}`
    if (refs.length === 0) {
      pending = clean
      continue
    }
    pending = ''
    for (const r of refs) out.set(r, `${out.get(r) ?? ''} ${clean}`)
  }
  // A bulleted answer cites once for the whole list: let the list support every cited source.
  const bullets = answer.split('\n').filter((l) => l.startsWith('- ')).join(' ')
  if (bullets) for (const r of out.keys()) out.set(r, `${out.get(r)} ${bullets}`)
  return out
}

/** Sentences of `text` that share most of their meaningful words with the supporting answer text. */
export function supportingSentences(text: string, support: string): Set<string> {
  const target = words(support)
  const scored = splitSentences(text).map((s) => {
    const w = words(s)
    let shared = 0
    for (const x of w) if (target.has(x)) shared += 1
    return { s, ratio: w.size ? shared / w.size : 0, shared }
  })
  const picked = scored.filter((x) => x.ratio >= 0.5 && x.shared >= 3)
  if (picked.length === 0 && scored.length) {
    const best = [...scored].sort((a, b) => b.shared - a.shared)[0]
    if (best.shared >= 2) picked.push(best)
  }
  return new Set(picked.map((x) => x.s))
}

const FOOTER = /^(Halcyon Dynamics Ltd\. - .*|Page \d+)$/

export interface PageLayout {
  headings: string[]
  paragraphs: string[]
  footer: string | null
}

/** Rebuild headings and paragraphs from PDF lines (which wrap mid-sentence). */
export function layoutPage(raw: string): PageLayout {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  const footerLines = lines.filter((l) => FOOTER.test(l))
  const footer = footerLines.length ? footerLines.join('   ') : null
  const body = lines.filter((l) => !FOOTER.test(l))
  const headings: string[] = []
  while (body.length > 1 && headings.length < 3 && body[0].split(/\s+/).length <= 9 && /^[A-Z0-9]/.test(body[0]) && !/[.!?:,;]$/.test(body[0])) {
    headings.push(body.shift() as string)
  }
  const width = Math.max(...body.map((l) => l.length), 1)
  const paragraphs: string[] = []
  let current: string[] = []
  for (const line of body) {
    current.push(line)
    if (/[.!?]$/.test(line) && line.length < width * 0.8) {
      paragraphs.push(current.join(' '))
      current = []
    }
  }
  if (current.length) paragraphs.push(current.join(' '))
  return { headings, paragraphs, footer }
}

/** Paragraphs split into sentences, flagging the ones that support the answer. */
export function markSentences(paragraph: string, support: Set<string>): { text: string; marked: boolean }[] {
  return splitSentences(paragraph).map((text) => ({ text, marked: support.has(text) }))
}
