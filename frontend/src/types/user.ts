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
  answer: number
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

export interface UserDataBundle {
  profile: Profile
  progress: ProgressMap
  favorites: FavoritesMap
  answers: AnswerRecord[]
  guide: GuideResult | null
  lastVisit: LastVisit | null
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
  }
}
