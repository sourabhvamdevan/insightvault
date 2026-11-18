// Port of the backend's keyword search (rank-bm25 BM25Okapi + the same tokenizer),
// used in demo mode for questions that have no pre-recorded results.

const TOKEN = /[a-z0-9]+(?:[-_.][a-z0-9]+)*/g

export const STOPWORDS = new Set(
  `a an and are as at be but by can could did do does for from had has have how i if in into is it
  its me my of on or our so than that the their them then there these they this to was we were what
  when where which who whom why will with would you your`.split(/\s+/),
)

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(TOKEN) ?? []).filter((t) => !STOPWORDS.has(t))
}

const K1 = 1.5
const B = 0.75
const EPSILON = 0.25

export class Bm25Index {
  private readonly ids: number[]
  private readonly docs: Map<string, number>[]
  private readonly lengths: number[]
  private readonly avgdl: number
  private readonly idf = new Map<string, number>()

  constructor(corpus: { id: number; text: string }[]) {
    this.ids = corpus.map((c) => c.id)
    const tokenized = corpus.map((c) => tokenize(c.text))
    this.lengths = tokenized.map((t) => t.length)
    this.avgdl = this.lengths.reduce((a, b) => a + b, 0) / Math.max(1, this.lengths.length)
    this.docs = tokenized.map((tokens) => {
      const tf = new Map<string, number>()
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
      return tf
    })
    const df = new Map<string, number>()
    for (const tf of this.docs) for (const term of tf.keys()) df.set(term, (df.get(term) ?? 0) + 1)
    const n = this.docs.length
    let idfSum = 0
    const negative: string[] = []
    for (const [term, freq] of df) {
      const idf = Math.log(n - freq + 0.5) - Math.log(freq + 0.5)
      this.idf.set(term, idf)
      idfSum += idf
      if (idf < 0) negative.push(term)
    }
    const floor = EPSILON * (idfSum / Math.max(1, df.size))
    for (const term of negative) this.idf.set(term, floor)
  }

  /** Top-k (chunkId, score) with score > 0, best first. */
  search(query: string, k: number): [number, number][] {
    const terms = tokenize(query)
    if (terms.length === 0 || this.ids.length === 0) return []
    const scores = this.docs.map((tf, i) => {
      let score = 0
      for (const term of terms) {
        const freq = tf.get(term) ?? 0
        if (freq === 0) continue
        const idf = this.idf.get(term) ?? 0
        score += (idf * (freq * (K1 + 1))) / (freq + K1 * (1 - B + (B * this.lengths[i]) / this.avgdl))
      }
      return score
    })
    return scores
      .map((s, i): [number, number] => [this.ids[i], s])
      .filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, k)
  }
}
