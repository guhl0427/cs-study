/** 本地实现：构建期打包的内容数据（tools/build-content.mjs 产物） */
import domainsJson from '@/content/gen/domains.json'
import siteJson from '@/content/gen/site.json'
import pathsJson from '@/content/gen/paths.json'
import coursesJson from '@/content/gen/courses.json'
import lessonsJson from '@/content/gen/lessons.json'
import quizzesJson from '@/content/gen/quizzes.json'
import type { ContentApi } from './contracts'
import type {
  Course,
  Domain,
  LearningPath,
  LessonView,
  Quiz,
  SiteConfig,
} from '@/types/content'

const domains = domainsJson as unknown as Domain[]
const site = siteJson as unknown as SiteConfig
const paths = pathsJson as unknown as Record<string, LearningPath>
const courses = coursesJson as unknown as Record<string, Course>
const lessons = lessonsJson as unknown as Record<string, Omit<LessonView, never>>
const quizzes = quizzesJson as unknown as Record<string, Quiz>

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
    for (const c of Object.values(courses)) {
      if (c.slug !== courseSlug) continue
      for (const ch of c.chapters) {
        const meta = ch.lessons.find((l) => l.slug === lessonSlug)
        const rec = meta ? lessons[meta.id] : undefined
        if (rec) return { meta: rec.meta, html: rec.html, toc: rec.toc }
      }
    }
    return undefined
  },

  getLessonById(lessonId) {
    const rec = lessons[lessonId]
    if (!rec) return undefined
    return { meta: rec.meta, html: rec.html, toc: rec.toc }
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
