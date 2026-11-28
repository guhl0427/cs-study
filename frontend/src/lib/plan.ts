/**
 * 周计划器（F1.2「每周计划建议」的落地）：把「路线 + 进度 + 每周预算」
 * 确定性地推导为「本周该学哪些知识点」。计划不落存储——完全由 progress
 * 推导（单一数据源纪律），完成即自动顺延。
 */
import type { LearningPath, PathItem, PathLessonRef } from '@/types/content'
import type { ProgressMap } from '@/types/user'
import { lessonState } from '@/lib/progress'

export interface PlanItem {
  lessonId: string
  lesson: PathLessonRef
}

export interface WeeklyPlan {
  /** 本周清单：未完成知识点按路线顺序截断到预算 */
  items: PlanItem[]
  /** 清单预计用时合计（分钟） */
  plannedMinutes: number
  budgetMinutes: number
  /** 路线整体进度（分支折叠后） */
  pathDone: number
  pathTotal: number
}

/** 找方向 time 答案 → 默认每周预算（分钟）：5h 以内 / 5–10h / 10h 以上 */
const BUDGET_BY_TIME: Record<string, number> = { low: 240, mid: 420, high: 720 }

export function defaultWeeklyMinutes(time?: string): number {
  return BUDGET_BY_TIME[time ?? ''] ?? 420
}

/**
 * 一个阶段内的候选节点：分支组折叠为单一选项——
 * 组内任一已完成 → 整组视为已满足；否则取组内第一个选项。
 */
function stageCandidates(stage: { items: PathItem[] }, progress: ProgressMap): PathItem[] {
  const out: PathItem[] = []
  const handled = new Set<string>()
  for (const item of stage.items) {
    if (!item.branch) {
      out.push(item)
      continue
    }
    if (handled.has(item.branch)) continue
    handled.add(item.branch)
    const group = stage.items.filter((it) => it.branch === item.branch && it.lesson)
    if (!group.length) continue // 空组（引用全失效）不产出候选
    const doneRep = group.find((it) => lessonState(it.lessonId, progress) === 'done')
    // 分支已满足：保留一个已完成代表计入路线进度（不再推荐该分支其余选项）
    out.push(doneRep ?? group[0]!)
  }
  return out
}

export function buildWeeklyPlan(
  path: LearningPath,
  progress: ProgressMap,
  budgetMinutes: number,
): WeeklyPlan {
  const candidates = path.stages
    .flatMap((s) => stageCandidates(s, progress))
    .filter((it) => it.lesson) as Array<PathItem & { lesson: PathLessonRef }>

  const pathTotal = candidates.length
  const pathDone = candidates.filter((it) => lessonState(it.lessonId, progress) === 'done').length

  const items: PlanItem[] = []
  let plannedMinutes = 0
  for (const it of candidates) {
    if (lessonState(it.lessonId, progress) === 'done') continue
    if (plannedMinutes >= budgetMinutes) break
    items.push({ lessonId: it.lessonId, lesson: it.lesson })
    plannedMinutes += it.lesson.estMinutes
  }
  return { items, plannedMinutes, budgetMinutes, pathDone, pathTotal }
}
