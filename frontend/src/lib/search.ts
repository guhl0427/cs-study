/**
 * 全局搜索（F6.1/F6.3）：构建期生成的检索文档 + MiniSearch 内存索引。
 * CJK 无空格分词：对中文串产出单字 + 相邻二元组，查询默认 prefix 匹配。
 * 检索文档（含知识点正文，独立分片）仅在首次搜索时动态加载，不随主包分发；
 * 索引为模块级单例，构建一次后为纯内存检索（无网络请求）。
 */
import MiniSearch from 'minisearch'

export interface SearchDoc {
  id: string
  type: '领域' | '课程' | '知识点'
  title: string
  summary: string
  tags: string
  extra: string
  crumb: string
  url: string
  domainSlug: string
  difficulty: number | null
  estMinutes: number | null
  /** 知识点文档的正文纯文本（构建期抽取并截断；领域/课程文档无此字段） */
  body?: string
}

export type SearchHit = SearchDoc & { score: number }

const CJK = /[\u4e00-\u9fff]/

/** 中文按单字+二元组切分，西文按词切分并小写（标点与符号一律切开） */
export const cjkTokenizer = (raw: string): string[] => {
  const out: string[] = []
  for (const word of raw.split(/[\s\p{P}\p{S}]+/u)) {
    if (!word) continue
    if (CJK.test(word)) {
      const chars = [...word]
      out.push(...chars)
      for (let i = 0; i < chars.length - 1; i += 1) out.push(chars[i] + chars[i + 1])
    } else {
      out.push(word.toLowerCase())
    }
  }
  return out
}

let docsPromise: Promise<SearchDoc[]> | null = null
let searcherPromise: Promise<MiniSearch<SearchDoc>> | null = null

/** 懒加载检索文档（独立 chunk，仅进入搜索后拉取一次） */
function loadDocs(): Promise<SearchDoc[]> {
  docsPromise ??= import('@/content/gen/search-docs.json').then(
    (m) => m.default as unknown as SearchDoc[],
  )
  return docsPromise
}

function getSearcher(): Promise<MiniSearch<SearchDoc>> {
  searcherPromise ??= (async () => {
    const docs = await loadDocs()
    const mini = new MiniSearch<SearchDoc>({
      fields: ['title', 'summary', 'tags', 'extra', 'body'],
      storeFields: ['type', 'title', 'summary', 'crumb', 'url', 'difficulty', 'estMinutes'],
      tokenize: cjkTokenizer,
      searchOptions: { prefix: true, boost: { title: 3, tags: 2, summary: 2, body: 1 } },
    })
    mini.addAll(docs)
    return mini
  })()
  return searcherPromise
}

/** 全局搜索：首次调用加载文档分片并构建索引（百毫秒级），此后为纯内存检索 */
export async function search(query: string): Promise<SearchHit[]> {
  const q = query.trim()
  if (!q) return []
  const searcher = await getSearcher()
  return searcher.search(q, { prefix: true }) as unknown as SearchHit[]
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 命中高亮：在「原文」上单遍匹配所有查询词元（最长优先），命中段与剩余段各自转义后包裹 <mark>。
 * 防 XSS：最终输出的每一段文本都经过 escapeHtml；
 * 防畸形标签：不在已插入 <mark>/实体 的字符串上二次替换，词元（如 mark/amp）不可能命中标签本身。
 */
export function highlight(text: string, query: string): string {
  const tokens = [...new Set(cjkTokenizer(query).filter((t) => t.length > 1 || CJK.test(t)))]
  if (!tokens.length) return escapeHtml(text)
  const re = new RegExp(
    tokens.sort((a, b) => b.length - a.length).map(escapeRegExp).join('|'),
    'gi',
  )
  let out = ''
  let last = 0
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0
    out += escapeHtml(text.slice(last, start)) + `<mark>${escapeHtml(m[0])}</mark>`
    last = start + m[0].length
  }
  return out + escapeHtml(text.slice(last))
}

const SNIPPET_BEFORE = 40
const SNIPPET_AFTER = 60

/**
 * 正文命中片段（F6.3）：查询词未出现在摘要中时（摘要本身解释不了命中），
 * 从知识点正文截取首处命中前后的上下文并高亮返回；无正文/无命中返回空串。
 */
export function bodySnippet(doc: SearchDoc, query: string): string {
  const tokens = [...new Set(cjkTokenizer(query).filter((t) => t.length > 1 || CJK.test(t)))]
  const body = doc.body ?? ''
  if (!body || !tokens.length) return ''
  if (tokens.some((t) => doc.summary.toLowerCase().includes(t.toLowerCase()))) return ''
  const lowerBody = body.toLowerCase()
  let at = -1
  let len = 1
  for (const t of [...tokens].sort((a, b) => b.length - a.length)) {
    const i = lowerBody.indexOf(t.toLowerCase())
    if (i >= 0 && (at < 0 || i < at)) {
      at = i
      len = t.length
    }
  }
  if (at < 0) return ''
  const start = Math.max(0, at - SNIPPET_BEFORE)
  const end = Math.min(body.length, at + len + SNIPPET_AFTER)
  return `${start > 0 ? '…' : ''}${highlight(body.slice(start, end), query)}${end < body.length ? '…' : ''}`
}
