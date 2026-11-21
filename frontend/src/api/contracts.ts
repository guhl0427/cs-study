/**
 * 服务适配层 · 接口契约（需求 §6.3）
 * ----------------------------------------
 * 页面只允许调用本文件导出的 contentApi，禁止直接读内容 JSON 或操作 localStorage。
 * M1：本地实现（内容为构建期打包的静态数据，因此接口是同步的——零加载态）。
 * M3 若接入后端：新增 api/remote 实现并在此处按环境切换，页面层零改动。
 */
import type { Course, Domain, LearningPath, LessonView, SiteConfig } from '@/types/content'

export interface ContentApi {
  listDomains(): Domain[]
  getDomain(slug: string): Domain | undefined
  listCoursesOfDomain(domainSlug: string): Course[]
  getCourse(slug: string): Course | undefined
  getLesson(courseSlug: string, lessonSlug: string): LessonView | undefined
  getLessonById(lessonId: string): LessonView | undefined
  listPaths(): LearningPath[]
  listPathsOfDomain(domainSlug: string): LearningPath[]
  getPath(slug: string): LearningPath | undefined
  getSite(): SiteConfig
}
