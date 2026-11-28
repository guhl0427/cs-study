/** 用户数据模型（localStorage，用户私有）——与需求 §7.2 对应 */

export type LessonStatus = 'learning' | 'done'

export interface ProgressEntry {
  status: LessonStatus
  updatedAt: string
  completedAt?: string
}

export type ProgressMap = Record<string, ProgressEntry>

export interface Profile {
  nickname: string
  avatarId: string
  startDate: string
  activePathId?: string
  /** 周计划每周预算（分钟）；未设置时由找方向的 time 答案推导（lib/plan） */
  weeklyMinutes?: number
}

export type FavTargetType = 'course' | 'lesson'

export interface FavoriteEntry {
  targetType: FavTargetType
  targetId: string
  createdAt: string
}

export type FavoritesMap = Record<string, FavoriteEntry>

export interface AnswerRecord {
  questionId: string
  quizId?: string
  /** 选择题为选项下标；填空题为作答文本（F5.4） */
  answer: number | string
  isCorrect: boolean
  answeredAt: string
}

export interface GuideAnswers {
  interest: string
  level: string
  time: string
}

export interface GuideResult {
  answers: GuideAnswers
  recommendedPathSlug?: string
  completedAt: string
}

export interface LastVisit {
  lessonId: string
  courseSlug: string
  lessonSlug: string
  at: string
}

/** 知识点本地笔记（v2）：lessonId → 笔记内容 */
export interface NoteEntry {
  content: string
  updatedAt: string
}
export type NotesMap = Record<string, NoteEntry>

/** 学习时长（v2）：dateKey(YYYY-MM-DD) → lessonId → 累计秒；保存时裁剪超过 365 天的日期 */
export type TimeLog = Record<string, Record<string, number>>

export interface UserDataBundle {
  profile: Profile
  progress: ProgressMap
  favorites: FavoritesMap
  answers: AnswerRecord[]
  guide: GuideResult | null
  lastVisit: LastVisit | null
  /** v2 新增；导入 v1 备份时由默认值兜底 */
  notes: NotesMap
  timeLog: TimeLog
}

export interface ExportFile {
  app: 'cs-study'
  schemaVersion: number
  exportedAt: string
  data: UserDataBundle
}

export type ImportStrategy = 'merge' | 'overwrite'

export interface ImportSummary {
  progress: number
  favorites: number
  answers: number
  notes: number
}

export const ANSWERS_LIMIT = 500

export function emptyBundle(): UserDataBundle {
  return {
    profile: { nickname: '', avatarId: '', startDate: '', activePathId: undefined },
    progress: {},
    favorites: {},
    answers: [],
    guide: null,
    lastVisit: null,
    notes: {},
    timeLog: {},
  }
}
