/**
 * 周计划器纯函数测试：预算截断、完成跳过、分支折叠。
 */
import { describe, expect, it } from 'vitest'
import { buildWeeklyPlan, defaultWeeklyMinutes } from './plan'
import type { LearningPath, PathItem, PathLessonRef } from '@/types/content'
import type { ProgressMap } from '@/types/user'

const lesson = (slug: string, estMinutes: number, courseSlug = 'c-x'): PathLessonRef => ({
  slug,
  title: slug,
  difficulty: 1,
  estMinutes,
  courseSlug,
})

const item = (id: string, lessonId: string, ref: PathLessonRef | null, branch: string | null = null): PathItem => ({
  id,
  lessonId,
  branch,
  prereqs: [],
  lesson: ref,
})

const pathOf = (stages: Array<Array<PathItem>>): LearningPath =>
  ({
    id: 'p-test',
    slug: 'p-test',
    domainSlug: 'd-test',
    name: '测试路线',
    description: '',
    stages: stages.map((items, i) => ({ id: `s-${i}`, name: `阶段${i}`, suggestDuration: '1 周', index: i + 1, items })),
    nodeCount: stages.flat().length,
  }) as unknown as LearningPath

const progressOf = (entries: Record<string, 'done' | 'learning'>): ProgressMap =>
  Object.fromEntries(
    Object.entries(entries).map(([id, status]) => [
      id,
      status === 'done'
        ? { status, updatedAt: '2026-11-28T00:00:00Z', completedAt: '2026-11-28T00:00:00Z' }
        : { status, updatedAt: '2026-11-28T00:00:00Z' },
    ]),
  ) as ProgressMap

describe('defaultWeeklyMinutes（找方向 time → 预算）', () => {
  it('low/mid/high 映射，未知值回落 7h', () => {
    expect(defaultWeeklyMinutes('low')).toBe(240)
    expect(defaultWeeklyMinutes('mid')).toBe(420)
    expect(defaultWeeklyMinutes('high')).toBe(720)
    expect(defaultWeeklyMinutes(undefined)).toBe(420)
  })
})

describe('buildWeeklyPlan', () => {
  const lA = lesson('a', 60)
  const lB = lesson('b', 120)
  const lC = lesson('c', 180)
  const lD = lesson('d', 30)

  it('按顺序取未完成知识点，累计截断到预算（单篇超预算仍保留）', () => {
    const path = pathOf([[item('i1', 'l-a', lA), item('i2', 'l-b', lB), item('i3', 'l-c', lC)]])
    const plan = buildWeeklyPlan(path, {}, 150)
    expect(plan.items.map((x) => x.lesson.slug)).toEqual(['a', 'b']) // 60+120=180 > 150，b 超预算仍保留
    expect(plan.plannedMinutes).toBe(180)
    expect(buildWeeklyPlan(path, {}, 59).items.map((x) => x.lesson.slug)).toEqual(['a'])
  })

  it('已完成知识点跳过且不占预算；整体进度正确', () => {
    const path = pathOf([[item('i1', 'l-a', lA), item('i2', 'l-b', lB), item('i3', 'l-c', lC)]])
    const plan = buildWeeklyPlan(path, progressOf({ 'l-a': 'done' }), 240)
    expect(plan.items.map((x) => x.lesson.slug)).toEqual(['b', 'c'])
    expect(plan.pathDone).toBe(1)
    expect(plan.pathTotal).toBe(3)
    expect(plan.plannedMinutes).toBe(300)
  })

  it('分支组：组内任一完成 → 整组满足；否则只取第一个选项', () => {
    const vue = lesson('vue', 120)
    const react = lesson('react', 120)
    const after = lesson('after', 60)
    const path = pathOf([[item('i-v', 'l-vue', vue, 'fe'), item('i-r', 'l-react', react, 'fe'), item('i-a', 'l-after', after)]])

    const fresh = buildWeeklyPlan(path, {}, 600)
    expect(fresh.items.map((x) => x.lesson.slug)).toEqual(['vue', 'after']) // 只取分支第一项

    const vueDone = buildWeeklyPlan(path, progressOf({ 'l-vue': 'done' }), 600)
    expect(vueDone.items.map((x) => x.lesson.slug)).toEqual(['after']) // 分支已满足，不推 react
    expect(vueDone.pathDone).toBe(1)
    expect(vueDone.pathTotal).toBe(2) // 分支折叠后总数
  })

  it('lesson 为 null 的节点跳过', () => {
    const path = pathOf([[item('i-bad', 'l-missing', null), item('i1', 'l-a', lA)]])
    const plan = buildWeeklyPlan(path, {}, 600)
    expect(plan.items.map((x) => x.lesson.slug)).toEqual(['a'])
    expect(plan.pathTotal).toBe(1)
  })

  it('全部完成 → 空清单', () => {
    const path = pathOf([[item('i1', 'l-a', lA), item('i2', 'l-d', lD)]])
    const plan = buildWeeklyPlan(path, progressOf({ 'l-a': 'done', 'l-d': 'done' }), 240)
    expect(plan.items).toHaveLength(0)
    expect(plan.pathDone).toBe(2)
    expect(plan.pathTotal).toBe(2)
  })
})
