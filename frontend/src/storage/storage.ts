/**
 * localStorage 原始读写（需求 §7.2）
 * - 键族统一前缀 cs-study:，独立键便于按类读写与迁移
 * - 写入失败（配额/隐私模式）返回 false，由上层决定降级表现
 * - 红线：本产品不存储任何敏感数据（§5），此处仍是唯一写入点
 */
import type {
  AnswerRecord,
  FavoritesMap,
  GuideResult,
  LastVisit,
  Profile,
  ProgressMap,
} from '@/types/user'

export const SCHEMA_VERSION = 1
const PREFIX = 'cs-study:'

export const KEY = {
  schemaVersion: `${PREFIX}schemaVersion`,
  profile: `${PREFIX}profile`,
  progress: `${PREFIX}progress`,
  favorites: `${PREFIX}favorites`,
  answers: `${PREFIX}answers`,
  guide: `${PREFIX}guide`,
  lastVisit: `${PREFIX}lastVisit`,
  meta: `${PREFIX}meta`,
} as const

/** 检测 localStorage 可用性（隐私模式 / 被禁用时降级为游客试用） */
export function isStorageAvailable(): boolean {
  try {
    const probe = `${PREFIX}__probe`
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* 忽略 */
  }
}

export function keySize(key: string): number {
  try {
    return (localStorage.getItem(key) ?? '').length * 2 // UTF-16 近似字节数
  } catch {
    return 0
  }
}

/* ---- 类型化存取 ---- */

export const loadProfile = () => readJson<Profile>(KEY.profile)
export const saveProfile = (v: Profile) => writeJson(KEY.profile, v)
export const loadProgress = () => readJson<ProgressMap>(KEY.progress)
export const saveProgress = (v: ProgressMap) => writeJson(KEY.progress, v)
export const loadFavorites = () => readJson<FavoritesMap>(KEY.favorites)
export const saveFavorites = (v: FavoritesMap) => writeJson(KEY.favorites, v)
export const loadAnswers = () => readJson<AnswerRecord[]>(KEY.answers)
export const saveAnswers = (v: AnswerRecord[]) => writeJson(KEY.answers, v)
export const loadGuide = () => readJson<GuideResult>(KEY.guide)
export const saveGuide = (v: GuideResult) => writeJson(KEY.guide, v)
export const loadLastVisit = () => readJson<LastVisit>(KEY.lastVisit)
export const saveLastVisit = (v: LastVisit) => writeJson(KEY.lastVisit, v)

export interface MetaInfo {
  lastExportAt: string
}
export const loadMeta = () => readJson<MetaInfo>(KEY.meta) ?? { lastExportAt: '' }
export const saveMeta = (v: MetaInfo) => writeJson(KEY.meta, v)
