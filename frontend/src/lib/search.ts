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

/** 中文按单字+二元组切分，西文按词切分并小写 */
export const cjkTokenizer = (raw: string): string[] => {
  const out: string[] = []
  for (const word of raw.split(/[\s\p{P}]+/u)) {
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

/** 命中高亮：先转义再按查询词包裹 <mark>（防 XSS：内容与查询都经过转义） */
export function highlight(text: string, query: string): string {
  const tokens = [...new Set(cjkTokenizer(query).filter((t) => t.length > 1 || CJK.test(t)))]
  let out = escapeHtml(text)
  if (!tokens.length) return out
  for (const t of tokens) {
    out = out.replace(new RegExp(escapeRegExp(escapeHtml(t)), 'gi'), (m) => `<mark>${m}</mark>`)
  }
  return out
}
