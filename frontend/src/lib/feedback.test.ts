/**
 * 内容纠错反馈（F3.6）：Issue 预填链接必须带上页面路径与版本上下文。
 */
import { describe, expect, it } from 'vitest'
import { buildFeedbackUrl } from './feedback'

describe('buildFeedbackUrl', () => {
  it('预填 title 与 body，body 含页面路径和内容版本', () => {
    const url = buildFeedbackUrl('https://github.com/guhl0427/cs-study/issues', '/course/x/lesson/y', 'v0.4.0')
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://github.com/guhl0427/cs-study/issues/new')
    expect(parsed.searchParams.get('title')).toBe('【内容反馈】/course/x/lesson/y')
    const body = parsed.searchParams.get('body') ?? ''
    expect(body).toContain('页面路径：/course/x/lesson/y')
    expect(body).toContain('内容版本：v0.4.0')
    expect(body).toContain('### 问题描述')
  })

  it('base 末尾斜杠被归一，路径中的中文与特殊字符被正确编码', () => {
    const url = buildFeedbackUrl('https://github.com/guhl0427/cs-study/issues/', '/course/c/lesson/l?x=1', 'v1')
    expect(url.startsWith('https://github.com/guhl0427/cs-study/issues/new?')).toBe(true)
    const parsed = new URL(url)
    expect(parsed.searchParams.get('title')).toBe('【内容反馈】/course/c/lesson/l?x=1')
    expect(parsed.searchParams.get('body')).toContain('页面路径：/course/c/lesson/l?x=1')
  })
})
