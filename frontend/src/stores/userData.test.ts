/**
 * 用户数据 store 的统计推导测试（F4.4 打卡 / streak）。
 * 约束：统计一律由 progress 推导（不单独存储）——这里的断言就是推导规则的规范。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserDataStore, favKey } from './userData'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

const dayKey = (offsetDays: number): string => {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const doneOn = (lessonId: string, offsetDays: number, hour = 10) => ({
  status: 'done' as const,
  updatedAt: `${dayKey(offsetDays)}T${String(hour).padStart(2, '0')}:00:00.000Z`,
  completedAt: `${dayKey(offsetDays)}T${String(hour).padStart(2, '0')}:00:00.000Z`,
})

describe('streakDays（连续学习天数）', () => {
  it('今天有记录 → 从今天倒数连续计数', () => {
    const ud = useUserDataStore()
    ud.progress = { a: doneOn('a', 0), b: doneOn('b', 1), c: doneOn('c', 2) }
    expect(ud.streakDays).toBe(3)
  })

  it('今天没有但昨天有 → 允许以昨天为锚点', () => {
    const ud = useUserDataStore()
    ud.progress = { a: doneOn('a', 1), b: doneOn('b', 2) }
    expect(ud.streakDays).toBe(2)
  })

  it('出现断档 → 断档处截断', () => {
    const ud = useUserDataStore()
    ud.progress = { a: doneOn('a', 0), b: doneOn('b', 1), gap: doneOn('gap', 3), c: doneOn('c', 4) }
    expect(ud.streakDays).toBe(2)
  })

  it('只有更早的历史记录 → streak 为 0（不虚报）', () => {
    const ud = useUserDataStore()
    ud.progress = { old: doneOn('old', 5) }
    expect(ud.streakDays).toBe(0)
  })

  it('空档案 → 0 天', () => {
    const ud = useUserDataStore()
    expect(ud.streakDays).toBe(0)
  })
})

describe('doneByDate / learningDays / totalDone', () => {
  it('按日期聚合完成数；learning 状态不计入打卡', () => {
    const ud = useUserDataStore()
    ud.progress = {
      a: doneOn('a', 0, 9),
      b: doneOn('b', 0, 14), // 同日第二篇
      c: doneOn('c', 1),
      d: { status: 'learning', updatedAt: dayKey(0) }, // 进行中不算完成
    }
    const byDate = ud.doneByDate
    expect(byDate[dayKey(0)]).toBe(2)
    expect(byDate[dayKey(1)]).toBe(1)
    expect(ud.learningDays).toBe(2)
    expect(ud.totalDone).toBe(3)
    expect(ud.hasProgress).toBe(true)
  })
})

describe('favorites 辅助', () => {
  it('favKey 生成稳定键', () => {
    expect(favKey('course', 'c1')).toBe('course_c1')
    expect(favKey('lesson', 'l1')).toBe('lesson_l1')
  })

  it('toggleFavorite 增删并落到 localStorage', () => {
    const ud = useUserDataStore()
    ud.toggleFavorite('course', 'c-web-frontend-basics', 'Web 前端入门')
    expect(ud.isFavorite('course', 'c-web-frontend-basics')).toBe(true)
    ud.toggleFavorite('course', 'c-web-frontend-basics', 'Web 前端入门')
    expect(ud.isFavorite('course', 'c-web-frontend-basics')).toBe(false)
  })
})
