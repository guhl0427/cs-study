/**
 * 用户数据 Store：本地档案 / 进度 / 收藏 / 作答 / 找方向 / 最近学习（F4、F7）
 * 纪律：SSR 与客户端首帧均为「空档案」，init() 仅在客户端执行——
 * 这样预渲染 HTML 与水合首帧一致，避免 hydration mismatch；
 * localStorage 装载完成后通过响应式更新刷新 UI。
 */
import { defineStore } from 'pinia'
import {
  isStorageAvailable,
  isStorageAvailable as probeStorage,
} from '@/storage/storage'
import {
  buildExportFile,
  clearAll,
  applyImport,
  exportFilename,
  loadBundle,
  saveMeta,
  saveProfile,
  saveProgress,
  saveFavorites,
  saveAnswers,
  saveGuide,
  saveLastVisit,
} from '@/storage/repository'
import {
  ANSWERS_LIMIT,
  emptyBundle,
  type AnswerRecord,
  type ExportFile,
  type FavoriteEntry,
  type FavTargetType,
  type GuideResult,
  type ImportStrategy,
  type ImportSummary,
  type LastVisit,
  type Profile,
} from '@/types/user'
import type { LessonMeta } from '@/types/content'
import { useUiStore } from '@/stores/ui'

export const favKey = (type: FavTargetType, id: string) => `${type}_${id}`

export const useUserDataStore = defineStore('userData', {
  state: () => ({
    ...emptyBundle(),
    meta: { lastExportAt: '' },
    loaded: false,
    storageOk: true,
    writeWarned: false,
  }),

  getters: {
    hasProgress: (s) => Object.keys(s.progress).length > 0,
    totalDone: (s) => Object.values(s.progress).filter((e) => e.status === 'done').length,

    /** 打卡日历数据：按日期聚合的完成数（由 progress 推导，不单独存储） */
    doneByDate(): Record<string, number> {
      const out: Record<string, number> = {}
      for (const e of Object.values(this.progress)) {
        if (e.status !== 'done' || !e.completedAt) continue
        const day = e.completedAt.slice(0, 10)
        out[day] = (out[day] ?? 0) + 1
      }
      return out
    },

    learningDays(): number {
      return Object.keys(this.doneByDate).length
    },

    streakDays(): number {
      const dates = this.doneByDate
      const cursor = new Date()
      const key = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      }
      if (!dates[key(cursor)]) cursor.setDate(cursor.getDate() - 1) // 允许「昨天」作为锚点
      let streak = 0
      while (dates[key(cursor)]) {
        streak += 1
        cursor.setDate(cursor.getDate() - 1)
      }
      return streak
    },

    showStorageWarning(): boolean {
      return this.loaded && !this.storageOk
    },
  },

  actions: {
    /** 仅客户端调用（App.vue onMounted） */
    init() {
      this.storageOk = probeStorage()
      if (!this.storageOk) {
        this.loaded = true
        return
      }
      const bundle = loadBundle()
      this.profile = bundle.profile
      this.progress = bundle.progress
      this.favorites = bundle.favorites
      this.answers = bundle.answers
      this.guide = bundle.guide
      this.lastVisit = bundle.lastVisit
      this.meta = loadBundleMeta()
      this.loaded = true
    },

    /** 写入失败统一兜底：游客试用提示（每会话一次，需求 §10 风险应对） */
    privateWarnWriteFailure() {
      const ui = useUiStore()
      this.storageOk = isStorageAvailable()
      if (!this.storageOk && !this.writeWarned) {
        this.writeWarned = true
        ui.toast('error', '进度无法保存：当前浏览器不允许本地存储，本次为游客试用')
      }
    },

    ensureLearning(lesson: Pick<LessonMeta, 'id' | 'courseSlug' | 'slug'>) {
      if (!lesson.courseSlug) return
      const now = new Date().toISOString()
      const entry = this.progress[lesson.id]
      if (!entry) {
        this.progress[lesson.id] = { status: 'learning', updatedAt: now }
      } else if (entry.status !== 'done') {
        entry.updatedAt = now
      }
      const visit: LastVisit = {
        lessonId: lesson.id,
        courseSlug: lesson.courseSlug,
        lessonSlug: lesson.slug,
        at: now,
      }
      this.lastVisit = visit
      if (this.storageOk && !saveProgress(this.progress)) this.privateWarnWriteFailure()
      if (this.storageOk && !saveLastVisit(visit)) this.privateWarnWriteFailure()
    },

    markDone(lesson: Pick<LessonMeta, 'id' | 'courseSlug' | 'slug' | 'title'>) {
      const now = new Date().toISOString()
      this.progress[lesson.id] = { status: 'done', updatedAt: now, completedAt: now }
      this.lastVisit = {
        lessonId: lesson.id,
        courseSlug: lesson.courseSlug ?? '',
        lessonSlug: lesson.slug,
        at: now,
      }
      if (this.storageOk && !saveProgress(this.progress)) this.privateWarnWriteFailure()
      if (this.storageOk && !saveLastVisit(this.lastVisit)) this.privateWarnWriteFailure()
      const ui = useUiStore()
      ui.toast('ok', `已记录：${lesson.title}`)
    },

    unmarkDone(lessonId: string) {
      delete this.progress[lessonId]
      if (this.storageOk && !saveProgress(this.progress)) this.privateWarnWriteFailure()
    },

    isFavorite(type: FavTargetType, id: string): boolean {
      return Boolean(this.favorites[favKey(type, id)])
    },

    toggleFavorite(type: FavTargetType, id: string, title: string) {
      const key = favKey(type, id)
      if (this.favorites[key]) {
        delete this.favorites[key]
        useUiStore().toast('info', `已取消收藏：${title}`)
      } else {
        const entry: FavoriteEntry = { targetType: type, targetId: id, createdAt: new Date().toISOString() }
        this.favorites[key] = entry
        useUiStore().toast('ok', `已收藏：${title}`)
      }
      if (this.storageOk && !saveFavorites(this.favorites)) this.privateWarnWriteFailure()
    },

    recordAnswer(rec: AnswerRecord) {
      this.answers.push(rec)
      if (this.answers.length > ANSWERS_LIMIT) this.answers.splice(0, this.answers.length - ANSWERS_LIMIT)
      if (this.storageOk && !saveAnswers(this.answers)) this.privateWarnWriteFailure()
    },

    saveGuideResult(result: GuideResult) {
      this.guide = result
      if (this.storageOk && !saveGuide(result)) this.privateWarnWriteFailure()
    },

    setProfile(patch: Partial<Profile>) {
      this.profile = { ...this.profile, ...patch }
      if (this.storageOk && !saveProfile(this.profile)) this.privateWarnWriteFailure()
    },

    setActivePath(pathId: string) {
      this.profile = { ...this.profile, activePathId: pathId }
      if (this.storageOk && !saveProfile(this.profile)) this.privateWarnWriteFailure()
    },

    /** 导出为 JSON 文件下载（F7.4）。返回文件名供 Toast。 */
    exportData(): string | null {
      const file: ExportFile = buildExportFile()
      const filename = exportFilename()
      try {
        const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        useUiStore().toast('error', '导出失败：浏览器阻止了文件下载')
        return null
      }
      this.meta.lastExportAt = file.exportedAt
      if (this.storageOk && !saveMeta(this.meta)) this.privateWarnWriteFailure()
      return filename
    },

    importData(file: ExportFile, strategy: ImportStrategy): ImportSummary {
      const summary = applyImport(file, strategy)
      const bundle = loadBundle()
      this.profile = bundle.profile
      this.progress = bundle.progress
      this.favorites = bundle.favorites
      this.answers = bundle.answers
      this.guide = bundle.guide
      this.lastVisit = bundle.lastVisit
      return summary
    },

    clearAllData() {
      clearAll()
      const fresh = emptyBundle()
      this.profile = fresh.profile
      this.progress = fresh.progress
      this.favorites = fresh.favorites
      this.answers = fresh.answers
      this.guide = null
      this.lastVisit = null
      this.meta = { lastExportAt: '' }
    },
  },
})

import { loadMeta } from '@/storage/repository'
function loadBundleMeta() {
  return loadMeta()
}
