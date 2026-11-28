/**
 * 全局搜索（F6.1）：构建期生成的检索文档 + MiniSearch 内存索引。
 * CJK 无空格分词：对中文串产出单字 + 相邻二元组，查询默认 prefix 匹配。
 * 索引为模块级单例，首次搜索时惰性构建（本地毫秒级，无网络请求）。
 */
import MiniSearch from 'minisearch'
import searchDocsJson from '@/content/gen/search-docs.json'

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
}

export const searchDocs = searchDocsJson as unknown as SearchDoc[]

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

let mini: MiniSearch<SearchDoc> | null = null

export function getSearcher(): MiniSearch<SearchDoc> {
  if (!mini) {
    mini = new MiniSearch<SearchDoc>({
      fields: ['title', 'summary', 'tags', 'extra'],
      storeFields: ['type', 'title', 'summary', 'crumb', 'url', 'difficulty', 'estMinutes'],
      tokenize: cjkTokenizer,
      searchOptions: { prefix: true, boost: { title: 3, tags: 2 } },
    })
    mini.addAll(searchDocs)
  }
  return mini
}

export function search(query: string): Array<SearchDoc & { score: number }> {
  const q = query.trim()
  if (!q) return []
  return getSearcher().search(q, { prefix: true }) as unknown as Array<SearchDoc & { score: number }>
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
