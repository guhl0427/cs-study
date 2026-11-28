/**
 * 错题复习节奏（回访留存层）：最新一次作答为「答错」且距今 ≥ 3 天 = 到期待重测。
 * 刻意用固定间隔 + 时间戳推导（不引入完整 SM-2）：数据全部来自作答记录，零新增存储。
 */
import type { AnswerRecord } from '@/types/user'

export const REVIEW_INTERVAL_DAYS = 3

/** 该题是否「已到期」：最新作答为答错且距今 ≥ 复习间隔 */
export function isReviewDue(latest: AnswerRecord | undefined, now = new Date()): boolean {
  if (!latest || latest.isCorrect) return false
  const due = new Date(latest.answeredAt)
  due.setDate(due.getDate() + REVIEW_INTERVAL_DAYS)
  return now.getTime() >= due.getTime()
}
