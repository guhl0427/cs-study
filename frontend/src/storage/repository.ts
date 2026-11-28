/**
 * 用户数据仓库：装载、导出/导入（含合并策略）、清空（F7.4–7.6）
 * 版本化：schemaVersion + 迁移链。当前 v2：新增 notes/timeLog 两键——
 * v1 备份导入时字段缺失，由 ?? 默认值兜底完成恒等迁移（无需数据变换）。
 * 孤儿记录策略：读取时不清洗，UI 按「内容存在才渲染」处理；
 * 导出/导入过程中顺带清理指向已删除内容的记录（需求 §7.2 设计要点 3）。
 */
import { SCHEMA_VERSION, KEY, readJson, writeJson, removeKey, keySize } from './storage'
import { loadProfile, saveProfile, loadProgress, saveProgress } from './storage'
import { loadFavorites, saveFavorites, loadAnswers, saveAnswers } from './storage'
import { loadNotes, saveNotes, loadTimeLog, saveTimeLog } from './storage'
import { loadGuide, saveGuide, loadLastVisit, saveLastVisit, loadMeta, saveMeta } from './storage'
import {
  ANSWERS_LIMIT,
  emptyBundle,
  type AnswerRecord,
  type ExportFile,
  type FavoritesMap,
  type ImportStrategy,
  type ImportSummary,
  type LastVisit,
  type NotesMap,
  type ProgressMap,
  type TimeLog,
  type UserDataBundle,
} from '@/types/user'

const nowISO = () => new Date().toISOString()

export function loadBundle(): UserDataBundle {
  const schemaVersion = readJson<number>(KEY.schemaVersion)
  if (schemaVersion !== null && schemaVersion !== SCHEMA_VERSION) {
    // 预留：后续版本在此按迁移链升级（需求 §7.3）
    console.warn(`[storage] 数据版本 ${schemaVersion} 与应用 ${SCHEMA_VERSION} 不一致，按当前版本处理`)
  }
  return {
    profile: loadProfile() ?? emptyBundle().profile,
    progress: loadProgress() ?? {},
    favorites: loadFavorites() ?? {},
    answers: loadAnswers() ?? [],
    guide: loadGuide(),
    lastVisit: loadLastVisit(),
    notes: loadNotes() ?? {},
    timeLog: loadTimeLog() ?? {},
  }
}

function persistSchemaVersion() {
  const cur = readJson<number>(KEY.schemaVersion)
  if (cur !== SCHEMA_VERSION) writeJson(KEY.schemaVersion, SCHEMA_VERSION)
}

/* ---------------- 导出（F7.4） ---------------- */

export function buildExportFile(): ExportFile {
  return {
    app: 'cs-study',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowISO(),
    data: loadBundle(),
  }
}

export function exportFilename(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `cs-study-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`
}

/* ---------------- 导入（F7.5） ---------------- */

export interface ParsedImport {
  ok: boolean
  error?: string
  file?: ExportFile
}

export function parseImportFile(text: string): ParsedImport {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: '这不是有效的 JSON 文件' }
  }
  const f = raw as Partial<ExportFile>
  if (f.app !== 'cs-study' || !f.data || typeof f.data !== 'object') {
    return { ok: false, error: '这不是 cs-study 导出文件（缺少标识字段）' }
  }
  if (typeof f.schemaVersion !== 'number' || f.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: `文件来自更新版本（schema ${f.schemaVersion}），请先升级应用` }
  }
  return { ok: true, file: f as ExportFile }
}

/**
 * 执行导入。merge：同名记录取较新、不删除现有数据；
 * overwrite：导入文件完全替换本机数据（调用方必须先二次确认）。
 */
export function applyImport(file: ExportFile, strategy: ImportStrategy): ImportSummary {
  const incoming = file.data

  if (strategy === 'overwrite') {
    saveProfile(incoming.profile ?? emptyBundle().profile)
    saveProgress(incoming.progress ?? {})
    saveFavorites(incoming.favorites ?? {})
    saveAnswers((incoming.answers ?? []).slice(-ANSWERS_LIMIT))
    saveNotes(incoming.notes ?? {})
    saveTimeLog(incoming.timeLog ?? {})
    if (incoming.guide) saveGuide(incoming.guide)
    if (incoming.lastVisit) saveLastVisit(incoming.lastVisit)
    persistSchemaVersion()
    return {
      progress: Object.keys(incoming.progress ?? {}).length,
      favorites: Object.keys(incoming.favorites ?? {}).length,
      answers: (incoming.answers ?? []).length,
      notes: Object.keys(incoming.notes ?? {}).length,
    }
  }

  // ---- 合并策略 ----
  let progressCount = 0
  const localProgress: ProgressMap = loadProgress() ?? {}
  for (const [lessonId, entry] of Object.entries(incoming.progress ?? {})) {
    const local = localProgress[lessonId]
    if (!local) {
      localProgress[lessonId] = entry
      progressCount += 1
    } else if ((entry.updatedAt ?? '') > (local.updatedAt ?? '')) {
      localProgress[lessonId] = entry
      progressCount += 1
    }
  }
  saveProgress(localProgress)

  let favoritesCount = 0
  const localFavorites: FavoritesMap = loadFavorites() ?? {}
  for (const [key, entry] of Object.entries(incoming.favorites ?? {})) {
    const local = localFavorites[key]
    if (!local || (entry.createdAt ?? '') > (local.createdAt ?? '')) {
      localFavorites[key] = entry
      favoritesCount += 1
    }
  }
  saveFavorites(localFavorites)

  let answersCount = 0
  const seen = new Set(
    (loadAnswers() ?? []).map((a) => `${a.questionId}:${a.answeredAt}`),
  )
  const merged: AnswerRecord[] = [
    ...(loadAnswers() ?? []),
    ...(incoming.answers ?? []).filter((a) => {
      const k = `${a.questionId}:${a.answeredAt}`
      if (seen.has(k)) return false
      seen.add(k)
      answersCount += 1
      return true
    }),
  ]
    .sort((a, b) => (a.answeredAt ?? '').localeCompare(b.answeredAt ?? ''))
    .slice(-ANSWERS_LIMIT)
  saveAnswers(merged)

  const inc = incoming.profile
  const localProfile = loadProfile()
  if (
    inc &&
    (inc.nickname || inc.avatarId || inc.startDate || inc.activePathId || inc.weeklyMinutes !== undefined)
  ) {
    saveProfile({
      nickname: inc.nickname || localProfile?.nickname || '',
      avatarId: inc.avatarId || localProfile?.avatarId || '',
      startDate: inc.startDate || localProfile?.startDate || '',
      activePathId: inc.activePathId ?? localProfile?.activePathId,
      weeklyMinutes: inc.weeklyMinutes ?? localProfile?.weeklyMinutes,
    })
  }

  const incGuide = incoming.guide
  const localGuide = loadGuide()
  if (incGuide && (!localGuide || (incGuide.completedAt ?? '') > (localGuide.completedAt ?? ''))) {
    saveGuide(incGuide)
  }
  const incVisit = incoming.lastVisit as LastVisit | null | undefined
  const localVisit = loadLastVisit()
  if (incVisit && (!localVisit || (incVisit.at ?? '') > (localVisit.at ?? ''))) {
    saveLastVisit(incVisit)
  }

  let notesCount = 0
  const localNotes: NotesMap = loadNotes() ?? {}
  for (const [lessonId, entry] of Object.entries(incoming.notes ?? {})) {
    const local = localNotes[lessonId]
    if (!local || (entry.updatedAt ?? '') > (local.updatedAt ?? '')) {
      localNotes[lessonId] = entry
      notesCount += 1
    }
  }
  saveNotes(localNotes)

  // 学习时长：按日期/知识点累加（时长是可加量，不做「较新覆盖」）
  const localTime: TimeLog = loadTimeLog() ?? {}
  for (const [day, lessons] of Object.entries(incoming.timeLog ?? {})) {
    const target = (localTime[day] ??= {})
    for (const [lessonId, seconds] of Object.entries(lessons)) {
      target[lessonId] = (target[lessonId] ?? 0) + (seconds ?? 0)
    }
  }
  saveTimeLog(localTime)

  persistSchemaVersion()
  return { progress: progressCount, favorites: favoritesCount, answers: answersCount, notes: notesCount }
}

/* ---------------- 清空（F7.6） ---------------- */

export function clearAll(): void {
  for (const key of Object.values(KEY)) removeKey(key)
}

/* ---------------- 用量统计（F4.7 / 设置页概览） ---------------- */

export interface UsageStats {
  bytes: number
  progressCount: number
  favoritesCount: number
  answersCount: number
}

export function usageStats(): UsageStats {
  let bytes = 0
  for (const key of Object.values(KEY)) bytes += keySize(key)
  return {
    bytes,
    progressCount: Object.keys(loadProgress() ?? {}).length,
    favoritesCount: Object.keys(loadFavorites() ?? {}).length,
    answersCount: (loadAnswers() ?? []).length,
  }
}

export { saveProfile, saveProgress, saveFavorites, saveAnswers, saveGuide, saveLastVisit, saveNotes, saveTimeLog, loadMeta, saveMeta }
