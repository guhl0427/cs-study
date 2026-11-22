/**
 * storage 仓库层单元测试（F7.4–7.6 的数据安全底线）
 * 用户唯一的资产是 localStorage——合并/覆盖/导入解析的正确性在这里锁死。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { applyImport, buildExportFile, clearAll, parseImportFile } from './repository'
import { loadAnswers, loadGuide, loadProgress, saveAnswers, saveGuide, saveProgress, saveProfile, loadProfile, loadFavorites, saveFavorites, loadLastVisit, saveLastVisit } from './storage'
import { ANSWERS_LIMIT, emptyBundle, type ExportFile, type FavoriteEntry, type AnswerRecord } from '@/types/user'

beforeEach(() => {
  localStorage.clear()
})

const rec = (questionId: string, isCorrect: boolean, answeredAt: string): AnswerRecord => ({
  questionId,
  quizId: 'q-test',
  answer: 0,
  isCorrect,
  answeredAt,
})

const fav = (key: string, createdAt: string): FavoriteEntry => ({
  targetType: key.startsWith('course') ? 'course' : 'lesson',
  targetId: key.split('_')[1] ?? key,
  createdAt,
})

describe('parseImportFile（F7.5 导入解析）', () => {
  it('拒绝非法 JSON', () => {
    const r = parseImportFile('not-json{{')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('JSON')
  })

  it('拒绝缺少应用标识的文件', () => {
    const r = parseImportFile(JSON.stringify({ app: 'other-app', data: {} }))
    expect(r.ok).toBe(false)
    expect(r.error).toContain('cs-study')
  })

  it('拒绝更高 schema 版本', () => {
    const r = parseImportFile(JSON.stringify({ app: 'cs-study', schemaVersion: 99, data: {} }))
    expect(r.ok).toBe(false)
    expect(r.error).toContain('升级')
  })

  it('接受合法导出文件', () => {
    const file = buildExportFile()
    const r = parseImportFile(JSON.stringify(file))
    expect(r.ok).toBe(true)
    expect(r.file?.data.profile).toBeDefined()
  })
})

describe('applyImport · merge 策略（同名取较新，不删除现有数据）', () => {
  it('progress：较新 updatedAt 覆盖，新增计数正确', () => {
    saveProgress({ l1: { status: 'learning', updatedAt: '2026-01-01T00:00:00Z' } })
    const file: ExportFile = {
      app: 'cs-study',
      schemaVersion: 1,
      exportedAt: '2026-06-01T00:00:00Z',
      data: {
        ...emptyBundle(),
        progress: {
          l1: { status: 'done', updatedAt: '2026-05-01T00:00:00Z', completedAt: '2026-05-01T00:00:00Z' },
          l2: { status: 'done', updatedAt: '2026-04-01T00:00:00Z', completedAt: '2026-04-01T00:00:00Z' },
          l3: { status: 'learning', updatedAt: '2025-01-01T00:00:00Z' }, // 比本地不存在 → 新增；本地无 l3
        },
      },
    }
    const s = applyImport(file, 'merge')
    const p = loadProgress()!
    expect(p.l1.status).toBe('done') // 较新覆盖
    expect(p.l2.status).toBe('done') // 新增
    expect(p.l3.status).toBe('learning') // 本地没有 → 新增
    expect(s.progress).toBe(3) // l1 更新 + l2/l3 新增
  })

  it('favorites：并集 + 同名取较新 createdAt', () => {
    saveFavorites({ course_a: fav('course_a', '2026-01-01T00:00:00Z') })
    const file: ExportFile = {
      app: 'cs-study',
      schemaVersion: 1,
      exportedAt: '2026-06-01T00:00:00Z',
      data: {
        ...emptyBundle(),
        favorites: {
          course_a: fav('course_a', '2026-05-01T00:00:00Z'), // 较新
          lesson_b: fav('lesson_b', '2026-02-01T00:00:00Z'), // 新增
        },
      },
    }
    applyImport(file, 'merge')
    const f = loadFavorites()!
    expect(Object.keys(f)).toHaveLength(2)
    expect(f.course_a.createdAt).toBe('2026-05-01T00:00:00Z')
    expect(f.lesson_b).toBeDefined()
  })

  it('answers：去重合并 + 按 answeredAt 排序 + FIFO 截断到上限', () => {
    saveAnswers([rec('q1', false, '2026-01-01T00:00:00Z')])
    const incoming: AnswerRecord[] = [
      rec('q1', false, '2026-01-01T00:00:00Z'), // 与本地重复
      rec('q2', true, '2026-02-01T00:00:00Z'),
    ]
    for (let i = 0; i < ANSWERS_LIMIT; i += 1) {
      incoming.push(rec(`bulk-${i}`, false, `2026-03-01T00:00:${String(i % 60).padStart(2, '0')}Z`))
    }
    const file: ExportFile = {
      app: 'cs-study',
      schemaVersion: 1,
      exportedAt: '2026-06-01T00:00:00Z',
      data: { ...emptyBundle(), answers: incoming },
    }
    const s = applyImport(file, 'merge')
    const a = loadAnswers()!
    expect(a).toHaveLength(ANSWERS_LIMIT) // FIFO 截断
    expect(a.every((x, i) => i === 0 || x.answeredAt >= a[i - 1].answeredAt)).toBe(true) // 时间有序
    expect(s.answers).toBe(incoming.length - 1) // 去掉 1 条重复后全部计入
    // 截断保最新：最旧的本地 q1 与较早的 q2 都被滚出
    expect(a.some((x) => x.questionId === 'q1')).toBe(false)
    expect(a.some((x) => x.questionId === 'q2')).toBe(false)
  })

  it('profile：导入方有内容时合并覆盖，无内容时保留本地', () => {
    saveProfile({ nickname: '本地昵称', avatarId: '🦉', startDate: '2026-01-01' })
    applyImport(
      { app: 'cs-study', schemaVersion: 1, exportedAt: '', data: { ...emptyBundle(), profile: { nickname: '导入昵称', avatarId: '🧭', startDate: '', activePathId: 'p-frontend' } } },
      'merge',
    )
    let p = loadProfile()!
    expect(p.nickname).toBe('导入昵称')
    expect(p.startDate).toBe('2026-01-01') // 导入方为空 → 保留本地

    applyImport(
      { app: 'cs-study', schemaVersion: 1, exportedAt: '', data: { ...emptyBundle(), profile: { nickname: '', avatarId: '', startDate: '' } } },
      'merge',
    )
    p = loadProfile()!
    expect(p.nickname).toBe('导入昵称') // 空档案不破坏本地
  })

  it('guide / lastVisit：较新者胜', () => {
    saveGuide({ answers: { interest: 'cs', level: 'some', time: 'mid' }, recommendedPathSlug: 'cs-fundamentals-path', completedAt: '2026-03-01T00:00:00Z' })
    saveLastVisit({ lessonId: 'l-a', courseSlug: 'c-a', lessonSlug: 'a', at: '2026-03-01T00:00:00Z' })
    applyImport(
      {
        app: 'cs-study', schemaVersion: 1, exportedAt: '',
        data: {
          ...emptyBundle(),
          guide: { answers: { interest: 'frontend', level: 'none', time: 'low' }, recommendedPathSlug: 'frontend-path', completedAt: '2026-05-01T00:00:00Z' },
          lastVisit: { lessonId: 'l-b', courseSlug: 'c-b', lessonSlug: 'b', at: '2026-01-01T00:00:00Z' }, // 更旧
        },
      },
      'merge',
    )
    expect(loadGuide()!.recommendedPathSlug).toBe('frontend-path') // 较新
    expect(loadLastVisit()!.lessonSlug).toBe('a') // 本地较新，保留
  })
})

describe('applyImport · overwrite 策略（完全替换，需调用方二次确认）', () => {
  it('用导入文件精确替换本机数据', () => {
    saveProgress({ old: { status: 'done', updatedAt: '2026-01-01T00:00:00Z' } })
    saveAnswers([rec('q-old', false, '2026-01-01T00:00:00Z')])
    const file: ExportFile = {
      app: 'cs-study',
      schemaVersion: 1,
      exportedAt: '2026-06-01T00:00:00Z',
      data: {
        ...emptyBundle(),
        progress: { l9: { status: 'done', updatedAt: '2026-05-01T00:00:00Z', completedAt: '2026-05-01T00:00:00Z' } },
        answers: [rec('q-new', true, '2026-05-01T00:00:00Z')],
      },
    }
    const s = applyImport(file, 'overwrite')
    expect(loadProgress()).toEqual(file.data.progress)
    expect(loadAnswers()).toEqual(file.data.answers)
    expect(s.progress).toBe(1)
  })

  it('overwrite 时 answers 超限同样截断', () => {
    const many: AnswerRecord[] = []
    for (let i = 0; i < ANSWERS_LIMIT + 20; i += 1) many.push(rec(`q-${i}`, false, `2026-01-01T00:${String(i % 60).padStart(2, '0')}:00Z`))
    const file: ExportFile = { app: 'cs-study', schemaVersion: 1, exportedAt: '', data: { ...emptyBundle(), answers: many } }
    applyImport(file, 'overwrite')
    expect(loadAnswers()).toHaveLength(ANSWERS_LIMIT)
  })
})

describe('buildExportFile / clearAll（F7.4 / F7.6）', () => {
  it('导出包含全部键族与 schema 版本', () => {
    saveProgress({ l1: { status: 'learning', updatedAt: '2026-01-01T00:00:00Z' } })
    const file = buildExportFile()
    expect(file.app).toBe('cs-study')
    expect(file.schemaVersion).toBe(1)
    expect(file.exportedAt).toBeTruthy()
    expect(file.data.progress.l1).toBeDefined()
  })

  it('清空删除所有 cs-study 键', () => {
    saveProgress({ l1: { status: 'learning', updatedAt: '2026-01-01T00:00:00Z' } })
    saveAnswers([rec('q1', false, '2026-01-01T00:00:00Z')])
    clearAll()
    expect(loadProgress()).toBeNull()
    expect(loadAnswers()).toBeNull()
    expect(localStorage.getItem('cs-study:schemaVersion')).toBeNull()
  })
})
