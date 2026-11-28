/**
 * 学习时长（TimeLog）的纯函数工具：过期裁剪、区间合计。
 * TimeLog = Record<dateKey, Record<lessonId, 秒>>（v2 用户数据域）。
 * 打卡日历/streak 一律由 progress 推导（store 纪律），本文件只服务「真实学习时长」。
 */
import type { TimeLog } from '@/types/user'
import { dateKey } from '@/lib/format'

export function todayKey(now = new Date()): string {
  return dateKey(now)
}

/** 裁剪超过 keepDays 天的日期（防 TimeLog 无限增长），返回新对象 */
export function pruneTimeLog(log: TimeLog, keepDays = 365, now = new Date()): TimeLog {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - keepDays)
  const cut = dateKey(cutoff)
  const out: TimeLog = {}
  for (const [day, lessons] of Object.entries(log)) {
    if (day >= cut) out[day] = lessons
  }
  return out
}

/** 近 days 天（含今天）的累计秒数 */
export function secondsInLastDays(log: TimeLog, days: number, now = new Date()): number {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - (days - 1))
  const cut = dateKey(cutoff)
  const today = dateKey(now)
  let sum = 0
  for (const [day, lessons] of Object.entries(log)) {
    if (day < cut || day > today) continue
    for (const s of Object.values(lessons)) sum += s
  }
  return sum
}
