/** 进度推导工具（F4.2 多级进度汇总：知识点 → 章节 → 课程 → 领域） */
import type { Course, LessonMeta } from '@/types/content'
import type { ProgressMap } from '@/types/user'

export type ProgressState = 'todo' | 'learning' | 'done'

export function lessonState(lessonId: string, progress: ProgressMap): ProgressState {
  const e = progress[lessonId]
  if (!e) return 'todo'
  return e.status === 'done' ? 'done' : 'learning'
}

export interface ProgressSummary {
  done: number
  learning: number
  total: number
  percent: number
}

export function courseProgress(course: Course, progress: ProgressMap): ProgressSummary {
  let done = 0
  let learning = 0
  for (const ch of course.chapters) {
    for (const l of ch.lessons) {
      const s = lessonState(l.id, progress)
      if (s === 'done') done += 1
      else if (s === 'learning') learning += 1
    }
  }
  const total = course.lessonCount
  return { done, learning, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}

export function domainProgress(courses: Course[], progress: ProgressMap): ProgressSummary {
  let done = 0
  let learning = 0
  let total = 0
  for (const c of courses) {
    const p = courseProgress(c, progress)
    done += p.done
    learning += p.learning
    total += p.total
  }
  return { done, learning, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}

/** 首个未完成知识点（「继续学习」的定位目标，按章节内顺序） */
export function findNextIncomplete(course: Course, progress: ProgressMap): LessonMeta | undefined {
  for (const ch of course.chapters) {
    for (const l of ch.lessons) {
      if (lessonState(l.id, progress) !== 'done') return l
    }
  }
  return undefined
}

/** 章节进度（课程页章节卡头部） */
export function chapterProgress(lessonIds: string[], progress: ProgressMap): { done: number; total: number } {
  const done = lessonIds.filter((id) => lessonState(id, progress) === 'done').length
  return { done, total: lessonIds.length }
}
