/**
 * 服务适配层 · 接口契约（需求 §6.3）
 * ----------------------------------------
 * 页面只允许调用本文件导出的 contentApi，禁止直接读内容 JSON 或操作 localStorage。
 * M1：本地实现。内容元数据（课程/知识点 meta）为构建期打包的静态数据，同步可得；
 * 知识点正文按课程分片懒加载（数 MB 正文不进主包）：ensureCourseLessons 预载后
 * getLesson 同步可得——由路由 beforeEnter 调用，SSG 与客户端导航都会先跑守卫再渲染。
 * M3 若接入后端：新增 api/remote 实现并在此处按环境切换，页面层零改动。
 */
import type { Course, Domain, LearningPath, LessonMeta, LessonView, Quiz, SiteConfig } from '@/types/content'

export interface ContentApi {
  listDomains(): Domain[]
  getDomain(slug: string): Domain | undefined
  listCoursesOfDomain(domainSlug: string): Course[]
  getCourse(slug: string): Course | undefined
  /** 知识点正文视图；需先对该课程调用 ensureCourseLessons（路由守卫已保证） */
  getLesson(courseSlug: string, lessonSlug: string): LessonView | undefined
  /** 知识点元数据（正文除外）——错题本/收藏/测验页等只读 meta 的场景 */
  getLessonById(lessonId: string): LessonMeta | undefined
  /** 预载课程的正文分片（幂等；缺失课程静默返回） */
  ensureCourseLessons(courseSlug: string): Promise<void>
  listPaths(): LearningPath[]
  listPathsOfDomain(domainSlug: string): LearningPath[]
  getPath(slug: string): LearningPath | undefined
  getQuiz(id: string): Quiz | undefined
  listQuizzes(): Quiz[]
  getSite(): SiteConfig
}
