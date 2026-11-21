/** 内容数据模型（构建期静态数据，用户只读）——与需求 §7.1 对应 */

export interface Domain {
  id: string
  slug: string
  name: string
  icon: string
  summary: string
  audience?: string
  prereqNote?: string
  advice?: string
  sortOrder: number
  /** 构建脚本派生 */
  courseCount: number
  hasContent: boolean
  difficultySpan: [number, number] | null
}

export type ResourceType = 'doc' | 'book' | 'video' | 'tool'

export interface Resource {
  id: string
  title: string
  url: string
  type: ResourceType
  difficulty: number
  note: string
}

export interface LessonRef {
  courseSlug: string
  lessonSlug: string
  title: string
}

export interface LessonMeta {
  id: string
  slug: string
  title: string
  difficulty: number
  estMinutes: number
  tags: string[]
  summary: string
  updated: string
  resources: Resource[]
  /** 构建脚本注入的归属与顺序信息 */
  chapterId?: string
  chapterTitle?: string
  chapterIndex?: number
  courseId?: string
  courseSlug?: string
  courseTitle?: string
  domainSlug?: string
  domainName?: string
  index?: number
  total?: number
  prev?: LessonRef | null
  next?: LessonRef | null
}

export interface Chapter {
  id: string
  title: string
  lessons: LessonMeta[]
  /** 构建脚本注入：该章节的随堂练习（content/quizzes 里 scopeType=chapter 且 scopeId=章 id） */
  quizId?: string
}

export interface QuizQuestion {
  id: string
  stem: string
  options: string[]
  /** 正确选项下标（答案随包下发是既定妥协，F5 说明） */
  answer: number
  explanation: string
  /** 薄弱知识点提示用（完成页「去复习」链接） */
  lessonId?: string
}

export interface Quiz {
  id: string
  scopeType: 'lesson' | 'chapter' | 'course'
  scopeId: string
  title: string
  questions: QuizQuestion[]
  /** 构建脚本注入：归属课程（scopeId 反查） */
  courseSlug?: string
  courseTitle?: string
}

export interface Course {
  id: string
  slug: string
  domainSlug: string
  title: string
  summary: string
  difficulty: number
  audience: string
  prereqs: string
  chapters: Chapter[]
  /** 构建脚本派生 */
  lessonCount: number
  estMinutesTotal: number
  difficultySpan: [number, number] | null
  /** 课程级综合测验（quizzes 里 scopeType=course 且 scopeId=课程 id） */
  quizId?: string
}

export interface PathLessonRef {
  slug: string
  title: string
  difficulty: number
  estMinutes: number
  courseSlug: string
}

export interface PathItem {
  id: string
  lessonId: string
  branch: string | null
  prereqs: string[]
  /** 构建脚本解析（引用完整性保证非空） */
  lesson: PathLessonRef | null
}

export interface PathStage {
  id: string
  name: string
  description?: string
  suggestDuration: string
  index: number
  items: PathItem[]
}

export interface LearningPath {
  id: string
  slug: string
  domainSlug: string
  name: string
  description: string
  targetAudience?: string
  stages: PathStage[]
  nodeCount: number
}

export interface QuickStart {
  id: string
  title: string
  desc: string
  pathSlug: string
}

export interface Featured {
  id: string
  title: string
  desc: string
  pathSlug?: string
  courseSlug?: string
}

export interface SiteConfig {
  quickStarts: QuickStart[]
  featured: Featured[]
  /** 内容纠错 GitHub Issue 入口；为空时 UI 降级为「复制反馈模板」（F3.6） */
  feedbackUrl?: string | null
}

export interface TocItem {
  id: string
  text: string
  level: number
}

export interface LessonView {
  meta: LessonMeta
  /** 构建期编译好的正文 HTML（markdown-it + Shiki blueprint-draft） */
  html: string
  toc: TocItem[]
}

export const DIFFICULTY_NAMES: Record<number, string> = {
  1: '入门',
  2: '基础',
  3: '进阶',
  4: '精通',
}
