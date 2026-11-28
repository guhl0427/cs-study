/**
 * 进度推导工具单测（F4.2 多级汇总）：CI 步骤名宣称的「统计推导」以此为实证。
 * 纪律：打卡日历 / streak 等统计一律由 progress 推导（userData.test.ts 已覆盖 store 侧），
 * 本文件覆盖 lib/progress.ts 的课程/章节/领域三级聚合与「继续学习」定位。
 */
import { describe, expect, it } from 'vitest'
import { chapterProgress, courseProgress, domainProgress, findNextIncomplete, lessonState } from './progress'
import type { Course, LessonMeta } from '@/types/content'
import type { ProgressMap } from '@/types/user'

const meta = (id: string): LessonMeta =>
  ({
    id,
    slug: id,
    title: id,
    difficulty: 1,
    estMinutes: 10,
    tags: [],
    summary: '',
    updated: '',
    resources: [],
  }) as LessonMeta

const mkCourse = (chapterLessons: string[][]): Course =>
  ({
    id: 'c-test',
    slug: 'c-test',
    domainSlug: 'd-test',
    title: '测试课程',
    summary: '',
    difficulty: 1,
    audience: '',
    prereqs: '',
    chapters: chapterLessons.map((lessonIds, i) => ({
      id: `ch-${i}`,
      title: `章节 ${i}`,
      lessons: lessonIds.map(meta),
    })),
    lessonCount: chapterLessons.flat().length,
    estMinutesTotal: 0,
    difficultySpan: null,
  }) as unknown as Course

const progress = (entries: Record<string, 'learning' | 'done'>): ProgressMap =>
  Object.fromEntries(
    Object.entries(entries).map(([id, status]) => [
      id,
      status === 'done'
        ? { status, updatedAt: '2026-11-28T00:00:00.000Z', completedAt: '2026-11-28T00:00:00.000Z' }
        : { status, updatedAt: '2026-11-28T00:00:00.000Z' },
    ]),
  ) as ProgressMap

describe('lessonState', () => {
  it('无记录 → todo；learning/done 原样返回', () => {
    const p = progress({ a: 'done', b: 'learning' })
    expect(lessonState('a', p)).toBe('done')
    expect(lessonState('b', p)).toBe('learning')
    expect(lessonState('c', p)).toBe('todo')
  })
})

describe('courseProgress（章节 → 课程聚合）', () => {
  it('done/learning/todo 计数与百分比只按 done 计算', () => {
    const course = mkCourse([['l1', 'l2'], ['l3']])
    const p = progress({ l1: 'done', l3: 'learning' })
    expect(courseProgress(course, p)).toEqual({ done: 1, learning: 1, total: 3, percent: 33 })
  })

  it('空课程 percent 为 0，不产生 NaN', () => {
    const course = mkCourse([])
    expect(courseProgress(course, {})).toEqual({ done: 0, learning: 0, total: 0, percent: 0 })
  })

  it('百分比四舍五入（2/3 ≈ 67）', () => {
    const course = mkCourse([['a', 'b', 'c']])
    expect(courseProgress(course, progress({ a: 'done', b: 'done' })).percent).toBe(67)
  })
})

describe('domainProgress（课程 → 领域聚合）', () => {
  it('跨课程求和', () => {
    const courses = [mkCourse([['a', 'b']]), mkCourse([['c', 'd', 'e']])]
    const p = progress({ a: 'done', b: 'learning', c: 'done', d: 'done', e: 'done' })
    expect(domainProgress(courses, p)).toEqual({ done: 4, learning: 1, total: 5, percent: 80 })
  })

  it('无课程时 percent 为 0', () => {
    expect(domainProgress([], {})).toEqual({ done: 0, learning: 0, total: 0, percent: 0 })
  })
})

describe('findNextIncomplete（「继续学习」定位，按章节内顺序）', () => {
  it('跳过已完成，返回首个未完成知识点', () => {
    const course = mkCourse([['a', 'b'], ['c']])
    const p = progress({ a: 'done' })
    expect(findNextIncomplete(course, p)?.id).toBe('b')
  })

  it('learning 也算未完成（返回它本身，进入后可继续）', () => {
    const course = mkCourse([['a', 'b']])
    expect(findNextIncomplete(course, progress({ a: 'learning' }))?.id).toBe('a')
  })

  it('全部完成返回 undefined', () => {
    const course = mkCourse([['a']])
    expect(findNextIncomplete(course, progress({ a: 'done' }))).toBeUndefined()
  })
})

describe('chapterProgress（课程页章节卡头部）', () => {
  it('按传入的章节内 lesson id 计数', () => {
    const p = progress({ a: 'done', b: 'learning' })
    expect(chapterProgress(['a', 'b', 'x'], p)).toEqual({ done: 1, total: 3 })
  })
})
