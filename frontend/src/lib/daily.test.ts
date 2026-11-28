/**
 * 每日一题测试：确定性抽题、到期错题优先、今日已答推导。
 */
import { describe, expect, it } from 'vitest'
import { isDailyAnswered, pickDailyQuestion, todayAnswerOf } from './daily'
import type { Quiz, QuizQuestion } from '@/types/content'
import type { AnswerRecord } from '@/types/user'

const q = (id: string): QuizQuestion => ({
  id,
  stem: `题干 ${id}`,
  options: ['A', 'B'],
  answer: 0,
  explanation: '解析',
})

const quizOf = (id: string, questions: QuizQuestion[]): Quiz =>
  ({ id, scopeType: 'course', scopeId: 'c-x', title: id, questions }) as Quiz

const rec = (questionId: string, isCorrect: boolean, answeredAt: string): AnswerRecord => ({
  questionId,
  answer: 0,
  isCorrect,
  answeredAt,
})

const now = new Date(2026, 10, 28, 15, 0, 0) // 本地 2026-11-28

describe('pickDailyQuestion', () => {
  const quizzes = [quizOf('q-a', [q('qa-1'), q('qa-2')]), quizOf('q-b', [q('qb-1')])]

  it('同一天多次抽取结果一致（确定性）', () => {
    const a = pickDailyQuestion(quizzes, [], now)
    const b = pickDailyQuestion(quizzes, [], now)
    expect(a?.question.id).toBe(b?.question.id)
    expect(a).not.toBeNull()
  })

  it('到期错题优先：只要存在到期题，一定从到期池抽', () => {
    const dueAt = new Date(now)
    dueAt.setDate(dueAt.getDate() - 10)
    const answers = [rec('qa-2', false, dueAt.toISOString())]
    for (let i = 0; i < 10; i += 1) {
      const picked = pickDailyQuestion(quizzes, answers, now)
      expect(picked?.question.id).toBe('qa-2')
    }
  })

  it('没有到期错题 → 全题库池', () => {
    const poolIds = new Set(['qa-1', 'qa-2', 'qb-1'])
    const picked = pickDailyQuestion(quizzes, [], now)
    expect(poolIds.has(picked!.question.id)).toBe(true)
  })

  it('题库为空 → null', () => {
    expect(pickDailyQuestion([], [], now)).toBeNull()
  })
})

describe('isDailyAnswered / todayAnswerOf', () => {
  const quizzes = [quizOf('q-a', [q('qa-1')])]
  const daily = pickDailyQuestion(quizzes, [], now)

  it('今天答过 → true；昨天答过 → false', () => {
    expect(isDailyAnswered(daily, [rec('qa-1', true, now.toISOString())], now)).toBe(true)
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isDailyAnswered(daily, [rec('qa-1', true, yesterday.toISOString())], now)).toBe(false)
  })

  it('todayAnswerOf 返回今日最新作答（供恢复完成态）', () => {
    const r = todayAnswerOf(daily, [rec('qa-1', false, now.toISOString())], now)
    expect(r?.isCorrect).toBe(false)
    expect(todayAnswerOf(daily, [], now)).toBeUndefined()
  })
})
