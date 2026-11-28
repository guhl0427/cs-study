/**
 * 每日一题（回访留存层）：以日期为种子做确定性抽取——同一天刷新/重开页面都是同一题。
 * 候选池优先「到期错题」（lib/review），池空时回退全题库。
 * 状态零存储：今日是否已答由作答记录推导。
 */
import type { Quiz, QuizQuestion } from '@/types/content'
import type { AnswerRecord } from '@/types/user'
import { dateKey } from '@/lib/format'
import { isReviewDue } from '@/lib/review'

export interface DailyQuestion {
  question: QuizQuestion
  quizId: string
}

/** FNV-1a → 32 位种子 */
function hashSeed(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32：轻量确定性 PRNG */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const flatten = (quizzes: Quiz[]): DailyQuestion[] =>
  quizzes.flatMap((q) => q.questions.map((question) => ({ question, quizId: q.id })))

export function pickDailyQuestion(
  quizzes: Quiz[],
  answers: AnswerRecord[],
  now = new Date(),
): DailyQuestion | null {
  const all = flatten(quizzes)
  if (!all.length) return null

  const latest = new Map<string, AnswerRecord>()
  for (const rec of answers) latest.set(rec.questionId, rec)
  const duePool = all.filter(({ question }) => isReviewDue(latest.get(question.id), now))
  const pool = duePool.length ? duePool : all

  // 稳定排序 + 日期种子：同一天必同一题
  const sorted = [...pool].sort((a, b) => a.question.id.localeCompare(b.question.id))
  const rng = mulberry32(hashSeed(dateKey(now)))
  return sorted[Math.floor(rng() * sorted.length)] ?? null
}

/** 今日是否已作答该题（按作答时间的本地日期比较） */
export function isDailyAnswered(
  daily: DailyQuestion | null,
  answers: AnswerRecord[],
  now = new Date(),
): boolean {
  if (!daily) return false
  const day = dateKey(now)
  return answers.some((a) => a.questionId === daily.question.id && dateKey(new Date(a.answeredAt)) === day)
}

/** 今日该题的最新作答记录（恢复完成态用） */
export function todayAnswerOf(
  daily: DailyQuestion | null,
  answers: AnswerRecord[],
  now = new Date(),
): AnswerRecord | undefined {
  if (!daily) return undefined
  const day = dateKey(now)
  return [...answers]
    .reverse()
    .find((a) => a.questionId === daily.question.id && dateKey(new Date(a.answeredAt)) === day)
}
