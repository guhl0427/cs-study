/**
 * 本地实现：构建期打包的内容数据（tools/build-content.mjs 产物）。
 * 元数据（domains/paths/courses/quizzes）静态打包、同步可得；
 * 知识点正文按课程分片（gen/lessons/{courseId}.json）经 import.meta.glob 懒加载——
 * 数 MB 正文不进主 chunk，路由 beforeEnter 预载后 getLesson 同步可得（见 contracts.ts）。
 */
import domainsJson from '@/content/gen/domains.json'
import siteJson from '@/content/gen/site.json'
import pathsJson from '@/content/gen/paths.json'
import coursesJson from '@/content/gen/courses.json'
import quizzesJson from '@/content/gen/quizzes.json'
import type { ContentApi } from './contracts'
import type {
  Course,
  Domain,
  LearningPath,
  LessonMeta,
  Quiz,
  SiteConfig,
  TocItem,
} from '@/types/content'

const domains = domainsJson as unknown as Domain[]
const site = siteJson as unknown as SiteConfig
const paths = pathsJson as unknown as Record<string, LearningPath>
const courses = coursesJson as unknown as Record<string, Course>
const quizzes = quizzesJson as unknown as Record<string, Quiz>

/** 全量知识点元数据索引：courses.json 已内嵌完整 meta（含归属/顺序/前后链），摊平一次 */
const lessonMetaById = new Map<string, LessonMeta>()
for (const c of Object.values(courses)) {
  for (const ch of c.chapters) {
    for (const l of ch.lessons) lessonMetaById.set(l.id, l)
  }
}

/** 课程正文分片：动态 import 懒加载（SSG 构建期在路由守卫中完成加载，产物随路由分包） */
interface LessonContent {
  html: string
  toc: TocItem[]
}
const lessonChunks = import.meta.glob<{ default: Record<string, LessonContent> }>(
  '../content/gen/lessons/*.json',
)
const loadedChunks = new Map<string, Record<string, LessonContent>>() // courseId → 内容表

async function loadCourseChunk(courseId: string): Promise<void> {
  if (loadedChunks.has(courseId)) return
  const loader = lessonChunks[`../content/gen/lessons/${courseId}.json`]
  if (!loader) return // 分片缺失（构建校验已保证孤儿不入库），静默返回
  loadedChunks.set(courseId, (await loader()).default)
}

export const localContentApi: ContentApi = {
  listDomains() {
    return [...domains].sort((a, b) => a.sortOrder - b.sortOrder)
  },

  getDomain(slug) {
    return domains.find((d) => d.slug === slug)
  },

  listCoursesOfDomain(domainSlug) {
    return Object.values(courses).filter((c) => c.domainSlug === domainSlug)
  },

  getCourse(slug) {
    return courses[slug]
  },

  getLesson(courseSlug, lessonSlug) {
    const course = courses[courseSlug]
    if (!course) return undefined
    const chunk = loadedChunks.get(course.id)
    if (!chunk) return undefined // 分片未载入：调用方应先 ensureCourseLessons
    for (const ch of course.chapters) {
      const meta = ch.lessons.find((l) => l.slug === lessonSlug)
      const rec = meta ? chunk[meta.id] : undefined
      if (meta && rec) return { meta, html: rec.html, toc: rec.toc }
    }
    return undefined
  },

  getLessonById(lessonId) {
    return lessonMetaById.get(lessonId)
  },

  async ensureCourseLessons(courseSlug) {
    const course = courses[courseSlug]
    if (course) await loadCourseChunk(course.id)
  },

  listPaths() {
    return Object.values(paths)
  },

  listPathsOfDomain(domainSlug) {
    return Object.values(paths).filter((p) => p.domainSlug === domainSlug)
  },

  getPath(slug) {
    return paths[slug]
  },

  getQuiz(id) {
    return quizzes[id]
  },

  listQuizzes() {
    return Object.values(quizzes)
  },

  getSite() {
    return site
  },
}
