/**
 * 学习时长（TimeLog）纯函数测试：日期键、裁剪、区间合计。
 */
import { describe, expect, it } from 'vitest'
import { dateKey } from '@/lib/format'
import { pruneTimeLog, secondsInLastDays } from './time'
import type { TimeLog } from '@/types/user'

const day = (offset: number, now = new Date()): string => {
  const d = new Date(now)
  d.setDate(d.getDate() - offset)
  return dateKey(d)
}

describe('pruneTimeLog（超过 365 天的日期被裁剪）', () => {
  it('保留近期日期，丢弃旧日期', () => {
    const now = new Date(2026, 10, 28)
    const log: TimeLog = {
      [day(0, now)]: { l1: 30 },
      [day(100, now)]: { l1: 60 },
      [day(400, now)]: { l2: 90 }, // 超过 365 天 → 丢弃
    }
    const pruned = pruneTimeLog(log, 365, now)
    expect(Object.keys(pruned)).toHaveLength(2)
    expect(pruned[day(400, now)]).toBeUndefined()
    expect(pruned[day(0, now)]).toEqual({ l1: 30 })
  })

  it('不修改原对象', () => {
    const now = new Date(2026, 10, 28)
    const log: TimeLog = { [day(400, now)]: { l1: 90 } }
    pruneTimeLog(log, 365, now)
    expect(Object.keys(log)).toHaveLength(1)
  })
})

describe('secondsInLastDays（近 N 天合计，含今天）', () => {
  it('只累计区间内的日期', () => {
    const now = new Date(2026, 10, 28)
    const log: TimeLog = {
      [day(0, now)]: { l1: 30, l2: 90 },
      [day(6, now)]: { l1: 60 }, // 7 天窗口边界内（含）
      [day(7, now)]: { l1: 60 }, // 窗口外
      [day(1, now)]: { l3: 10 },
    }
    expect(secondsInLastDays(log, 7, now)).toBe(30 + 90 + 60 + 10)
    expect(secondsInLastDays(log, 1, now)).toBe(30 + 90)
    expect(secondsInLastDays({}, 7, now)).toBe(0)
  })
})
