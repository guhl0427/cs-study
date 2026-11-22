/**
 * 搜索分词器与高亮的纯函数测试（F6.1 的中文处理 + XSS 红线）。
 */
import { describe, expect, it } from 'vitest'
import { cjkTokenizer, highlight, search } from './search'

describe('cjkTokenizer（中文单字 + 二元组）', () => {
  it('中文串产出单字与相邻二元组', () => {
    const tokens = cjkTokenizer('异步编程')
    expect(tokens).toContain('异')
    expect(tokens).toContain('步')
    expect(tokens).toContain('异步')
    expect(tokens).toContain('步编')
    expect(tokens).toContain('编程')
  })

  it('西文按词切分并小写', () => {
    expect(cjkTokenizer('Hello World')).toEqual(['hello', 'world'])
  })

  it('标点分隔不同词元', () => {
    const tokens = cjkTokenizer('Promise 与异步编程。')
    expect(tokens).toContain('promise')
    expect(tokens).toContain('编程')
    expect(tokens.some((t) => t.includes('。'))).toBe(false)
  })
})

describe('highlight（先转义再包 mark —— XSS 红线）', () => {
  it('命中词被 <mark> 包裹', () => {
    expect(highlight('Promise 与异步', '异步')).toBe('Promise 与<mark>异</mark><mark>步</mark>')
  })

  it('HTML 字符被转义，绝不注入裸标签', () => {
    const out = highlight('<script>alert("x")</script>', 'alert')
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;')
    expect(out).toContain('<mark>alert</mark>')
  })

  it('查询词中的正则特殊字符不导致异常', () => {
    expect(() => highlight('a.c (x)*', 'a.c')).not.toThrow()
  })
})

describe('search（内存索引，构建期文档）', () => {
  it('中文查询命中知识点', () => {
    const hits = search('异步')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].title).toContain('Promise')
  })

  it('西文查询不区分大小写', () => {
    const hits = search('promise')
    expect(hits.some((h) => h.title.includes('Promise'))).toBe(true)
  })

  it('空查询返回空数组', () => {
    expect(search('   ')).toEqual([])
  })
})
