/**
 * 错题到期节奏测试：固定间隔推导，零新增存储。
 */
import { describe, expect, it } from 'vitest'
import { isReviewDue, REVIEW_INTERVAL_DAYS } from './review'
import type { AnswerRecord } from '@/types/user'

const rec = (isCorrect: boolean, answeredAt: string): AnswerRecord => ({
  questionId: 'q1',
  answer: 0,
  isCorrect,
  answeredAt,
})

const now = new Date('2026-11-28T12:00:00Z')
const daysAgo = (n: number) => {
  const d = new Date(now)
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

describe('isReviewDue', () => {
  it(`答错且距今 ≥ ${REVIEW_INTERVAL_DAYS} 天 → 到期（恰好第 3 天即到期）`, () => {
    expect(isReviewDue(rec(false, daysAgo(REVIEW_INTERVAL_DAYS)), now)).toBe(true)
    expect(isReviewDue(rec(false, daysAgo(REVIEW_INTERVAL_DAYS - 1)), now)).toBe(false)
  })

  it('最新作答已答对 → 永不到期（已重做）', () => {
    expect(isReviewDue(rec(true, daysAgo(30)), now)).toBe(false)
  })

  it('无作答记录 → false', () => {
    expect(isReviewDue(undefined, now)).toBe(false)
  })
})
