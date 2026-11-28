/**
 * 填空题判分测试（F5.4）。
 */
import { describe, expect, it } from 'vitest'
import { isBlankCorrect } from './quiz'

describe('isBlankCorrect', () => {
  it('精确匹配标准答案', () => {
    expect(isBlankCorrect('const', { answer: 'const' })).toBe(true)
    expect(isBlankCorrect('let', { answer: 'const' })).toBe(false)
  })

  it('忽略全部空白差异（含全角空格）', () => {
    expect(isBlankCorrect('  const  ', { answer: 'const' })).toBe(true)
    expect(isBlankCorrect('a　b', { answer: 'ab' })).toBe(true) // 全角空格 U+3000
    expect(isBlankCorrect('sort ()', { answer: 'sort()' })).toBe(true)
  })

  it('alts 变体等价', () => {
    const blank = { answer: 'sort', alts: ['sort()', '.sort'] }
    expect(isBlankCorrect('.sort', blank)).toBe(true)
    expect(isBlankCorrect('SORT()', blank)).toBe(false) // 大小写敏感（代码类答案）
    expect(isBlankCorrect('sort()', blank)).toBe(true)
  })

  it('空作答不判对', () => {
    expect(isBlankCorrect('', { answer: 'const' })).toBe(false)
    expect(isBlankCorrect('   ', { answer: 'const' })).toBe(false)
  })
})
