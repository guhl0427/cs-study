#!/usr/bin/env node
/**
 * 内容构建脚本（F8.2 内容工程化）
 * ---------------------------------------------------------------
 * 1. 校验 content/：frontmatter schema、slug 全局唯一、引用完整性
 *    （课程→知识点、路线→知识点、站点配置→路线/课程）、外链 URL 格式
 * 2. 把知识点 Markdown 构建期编译为 HTML（markdown-it + Shiki
 *    自定义主题 blueprint-draft，对齐 design/tokens.md §9）
 * 3. 产出 frontend/src/content/gen/：
 *    domains.json / site.json / paths.json / courses.json
 *    lessons/{courseId}.json（正文按课程分片，客户端按需动态加载）
 *    routes-manifest.json（vite-ssg includedRoutes 预渲染清单）
 * 4. 生成 frontend/public/404.html（GitHub Pages 项目页的 404 桥页，base 随 --site 注入）
 *
 * 校验不通过 → 进程退出码 1，构建失败（发布即拦截）。
 *
 * 用法：node tools/build-content.mjs [--content content] [--out frontend/src/content/gen]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHighlighter } from 'shiki'
import MarkdownIt from 'markdown-it'
import matter from 'gray-matter'

// ---------------------------------------------------------------- 参数
const argv = process.argv.slice(2)
const argOf = (name, fallback) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const contentDir = path.resolve(argOf('--content', path.join(repoRoot, 'content')))
const outDir = path.resolve(argOf('--out', path.join(repoRoot, 'frontend/src/content/gen')))

const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const QUIZ_SCOPES = new Set(['lesson', 'chapter', 'course'])
const errors = []
const warnings = []
const err = (cond, msg) => { if (!cond) errors.push(msg) }
const warn = (cond, msg) => { if (!cond) warnings.push(msg) }

// ---------------------------------------------------------------- 读取
const domains = readJSON(path.join(contentDir, 'domains.json'))
const site = readJSON(path.join(contentDir, 'site.json'))
const courseFiles = fs.readdirSync(path.join(contentDir, 'courses')).filter((f) => f.endsWith('.json')).sort()
const pathFiles = fs.readdirSync(path.join(contentDir, 'paths')).filter((f) => f.endsWith('.json')).sort()
const lessonFiles = fs.readdirSync(path.join(contentDir, 'lessons')).filter((f) => f.endsWith('.md')).sort()

// ---------------------------------------------------------------- 校验：领域
const domainIds = new Set()
const domainSlugs = new Set()
const domainBySlug = new Map()
for (const d of domains) {
  err(typeof d.id === 'string' && d.id, `domains.json: 领域缺少 id：${JSON.stringify(d.name)}`)
  err(typeof d.slug === 'string' && d.slug, `domains.json: 领域缺少 slug：${d.id}`)
  err(typeof d.name === 'string' && d.name, `domains.json: 领域缺少 name：${d.id}`)
  err(typeof d.icon === 'string' && d.icon, `domains.json: 领域缺少 icon：${d.id}`)
  err(typeof d.summary === 'string' && d.summary, `domains.json: 领域缺少 summary：${d.id}`)
  err(Number.isInteger(d.sortOrder), `domains.json: 领域 sortOrder 必须是整数：${d.id}`)
  err(!domainIds.has(d.id), `domains.json: 领域 id 重复：${d.id}`)
  err(!domainSlugs.has(d.slug), `domains.json: 领域 slug 重复：${d.slug}`)
  domainIds.add(d.id)
  domainSlugs.add(d.slug)
  domainBySlug.set(d.slug, d)
}

// ---------------------------------------------------------------- 校验：知识点
const RESOURCE_TYPES = new Set(['doc', 'book', 'video', 'tool'])
const allSlugs = new Set(domainSlugs)
const lessons = new Map() // lessonId -> { meta, raw }
for (const file of lessonFiles) {
  const filePath = path.join(contentDir, 'lessons', file)
  const expectedId = path.basename(file, '.md')
  const { data: fm, content } = matter(fs.readFileSync(filePath, 'utf8'))

  err(fm.id === expectedId, `lessons/${file}: frontmatter id（${fm.id}）必须与文件名一致（${expectedId}）`)
  for (const field of ['id', 'slug', 'title', 'difficulty', 'estMinutes']) {
    err(fm[field] !== undefined && fm[field] !== null && fm[field] !== '', `lessons/${file}: frontmatter 缺少 ${field}`)
  }
  err(Number.isInteger(fm.difficulty) && fm.difficulty >= 1 && fm.difficulty <= 4, `lessons/${file}: difficulty 必须是 1–4`)
  err(Number.isInteger(fm.estMinutes) && fm.estMinutes > 0, `lessons/${file}: estMinutes 必须是正整数`)
  err(Array.isArray(fm.tags), `lessons/${file}: tags 必须是数组`)
  err(typeof fm.summary === 'string' && fm.summary, `lessons/${file}: 缺少 summary（列表与搜索用）`)
  err(typeof content === 'string' && content.trim().length > 0, `lessons/${file}: 正文为空`)
  if (allSlugs.has(fm.slug)) err(false, `lessons/${file}: slug 与其他内容冲突：${fm.slug}`)
  allSlugs.add(fm.slug)

  for (const r of fm.resources ?? []) {
    err(r.id && r.title && r.url && r.type, `lessons/${file}: 资源缺少 id/title/url/type：${JSON.stringify(r)}`)
    err(RESOURCE_TYPES.has(r.type), `lessons/${file}: 资源 type 必须是 doc/book/video/tool：${r.type}`)
    err(/^https?:\/\/.+/.test(r.url ?? ''), `lessons/${file}: 资源 URL 必须是 http(s)：${r.url}`)
    warn(r.note && r.note.length > 0, `lessons/${file}: 资源 ${r.id} 缺少推荐语 note`)
  }

  lessons.set(fm.id, {
    meta: {
      id: fm.id,
      slug: fm.slug,
      title: fm.title,
      difficulty: fm.difficulty,
      estMinutes: fm.estMinutes,
      tags: fm.tags ?? [],
      summary: fm.summary ?? '',
      updated: fm.updated ?? '',
      resources: (fm.resources ?? []).map((r) => ({
        id: r.id, title: r.title, url: r.url, type: r.type, difficulty: r.difficulty ?? fm.difficulty, note: r.note ?? '',
      })),
    },
    raw: content,
    file,
  })
}

// ---------------------------------------------------------------- 校验：课程
const courses = []
const courseBySlug = new Map()
for (const file of courseFiles) {
  const c = readJSON(path.join(contentDir, 'courses', file))
  err(typeof c.id === 'string' && c.id, `courses/${file}: 缺少 id`)
  err(typeof c.slug === 'string' && c.slug, `courses/${file}: 缺少 slug`)
  err(domainSlugs.has(c.domainSlug), `courses/${file}: domainSlug 不存在：${c.domainSlug}`)
  err(Number.isInteger(c.difficulty) && c.difficulty >= 1 && c.difficulty <= 4, `courses/${file}: difficulty 必须是 1–4：${c.slug}`)
  err(Array.isArray(c.chapters) && c.chapters.length > 0, `courses/${file}: 章节为空：${c.slug}`)
  err(!allSlugs.has(c.slug), `courses/${file}: slug 冲突：${c.slug}`)
  allSlugs.add(c.slug)

  const seenLessons = new Set()
  const chapters = []
  for (const ch of c.chapters ?? []) {
    err(ch.id && ch.title, `courses/${file}: 章节缺少 id/title：${c.slug}`)
    const resolved = []
    for (const lessonId of ch.lessons ?? []) {
      err(lessons.has(lessonId), `courses/${file}: 章节 ${ch.id} 引用的知识点不存在：${lessonId}`)
      err(!seenLessons.has(lessonId), `courses/${file}: 知识点被重复引用：${lessonId}`)
      seenLessons.add(lessonId)
      if (lessons.has(lessonId)) resolved.push(lessonId)
    }
    chapters.push({ id: ch.id, title: ch.title, lessonIds: resolved })
  }
  courses.push({ ...c, chapters })
  courseBySlug.set(c.slug, courses[courses.length - 1])
}

// ---------------------------------------------------------------- 校验：路线
const paths = []
const pathBySlug = new Map()
for (const file of pathFiles) {
  const p = readJSON(path.join(contentDir, 'paths', file))
  err(typeof p.id === 'string' && p.id, `paths/${file}: 缺少 id`)
  err(typeof p.slug === 'string' && p.slug, `paths/${file}: 缺少 slug`)
  err(domainSlugs.has(p.domainSlug), `paths/${file}: domainSlug 不存在：${p.domainSlug}`)
  err(Array.isArray(p.stages) && p.stages.length > 0, `paths/${file}: 阶段为空：${p.slug}`)
  err(!allSlugs.has(p.slug), `paths/${file}: slug 冲突：${p.slug}`)
  allSlugs.add(p.slug)

  const itemIds = new Set()
  for (const stage of p.stages ?? []) {
    err(stage.id && stage.name, `paths/${file}: 阶段缺少 id/name：${p.slug}`)
    err(typeof stage.suggestDuration === 'string' && stage.suggestDuration, `paths/${file}: 阶段缺少建议时长：${stage.id}`)
    for (const item of stage.items ?? []) {
      err(item.id && item.lessonId, `paths/${file}: 节点缺少 id/lessonId：${stage.id}`)
      err(lessons.has(item.lessonId), `paths/${file}: 节点引用的知识点不存在：${item.lessonId}`)
      err(!itemIds.has(item.id), `paths/${file}: 节点 id 重复：${item.id}`)
      itemIds.add(item.id)
    }
  }
  for (const stage of p.stages ?? []) {
    const branchCount = new Map()
    for (const item of stage.items ?? []) {
      for (const pre of item.prereqs ?? []) {
        err(itemIds.has(pre), `paths/${file}: 节点 ${item.id} 的前置不存在：${pre}`)
      }
      if (item.branch) branchCount.set(item.branch, (branchCount.get(item.branch) ?? 0) + 1)
    }
    for (const [branch, n] of branchCount) {
      warn(n >= 2, `paths/${file}: 分支 ${branch} 只有 1 个选项（分支语义上应 ≥2）`)
    }
  }
  paths.push(p)
  pathBySlug.set(p.slug, p)
}

// ---------------------------------------------------------------- 校验：站点配置
for (const qs of site.quickStarts ?? []) err(pathBySlug.has(qs.pathSlug), `site.json: 快捷入口引用的路线不存在：${qs.pathSlug}`)
for (const f of site.featured ?? []) {
  err(pathBySlug.has(f.pathSlug) || courseBySlug.has(f.courseSlug), `site.json: 精选位引用的路线/课程不存在：${f.id}`)
}

// ---------------------------------------------------------------- Markdown → HTML（构建期）
const blueprintTheme = {
  name: 'Blueprint Draft',
  type: 'light',
  colors: { 'editor.background': '#F6FAFD', 'editor.foreground': '#14293D' },
  settings: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#52677C', fontStyle: 'italic' } },
    { scope: ['keyword', 'keyword.control', 'keyword.operator.logical', 'storage.type'], settings: { foreground: '#1B62A6', fontStyle: 'bold' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: '#0E7C86' } },
    { scope: ['string', 'string.quoted'], settings: { foreground: '#2E7D4F' } },
    { scope: ['constant.numeric'], settings: { foreground: '#7C5CBF' } },
    { scope: ['punctuation', 'meta.brace'], settings: { foreground: '#52677C' } },
    { scope: ['variable', 'source', 'meta.embedded'], settings: { foreground: '#14293D' } },
    { scope: ['entity.name.tag'], settings: { foreground: '#1B62A6' } },
    { scope: ['entity.other.attribute-name'], settings: { foreground: '#0E7C86' } },
  ],
}

const LANG_MAP = {
  js: 'javascript', javascript: 'javascript', mjs: 'javascript', ts: 'typescript', typescript: 'typescript',
  html: 'html', xml: 'html', vue: 'html', css: 'css', scss: 'css', json: 'json',
  bash: 'bash', sh: 'bash', shell: 'bash', zsh: 'bash', python: 'python', py: 'python',
  sql: 'sql', mysql: 'sql', postgresql: 'sql',
}
const LANG_LABEL = { javascript: 'js', typescript: 'ts', html: 'html', css: 'css', json: 'json', bash: 'shell', python: 'py' }

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 深色主题色板（与 main.css [data-theme='dark'] 的令牌套件同步维护）
const blueprintDarkTheme = {
  name: 'Blueprint Draft Dark',
  type: 'dark',
  colors: { 'editor.background': '#0F1826', 'editor.foreground': '#E3E9F2' },
  settings: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#7E93A6', fontStyle: 'italic' } },
    { scope: ['keyword', 'keyword.control', 'keyword.operator.logical', 'storage.type'], settings: { foreground: '#6FA3E8', fontStyle: 'bold' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: '#4FB3BF' } },
    { scope: ['string', 'string.quoted'], settings: { foreground: '#58B380' } },
    { scope: ['constant.numeric'], settings: { foreground: '#A98FD8' } },
    { scope: ['punctuation', 'meta.brace'], settings: { foreground: '#9AA8BC' } },
    { scope: ['variable', 'source', 'meta.embedded'], settings: { foreground: '#E3E9F2' } },
    { scope: ['entity.name.tag'], settings: { foreground: '#6FA3E8' } },
    { scope: ['entity.other.attribute-name'], settings: { foreground: '#4FB3BF' } },
  ],
}
let highlighter
try {
  highlighter = await createHighlighter({
    themes: [blueprintTheme, blueprintDarkTheme],
    langs: ['javascript', 'typescript', 'html', 'css', 'json', 'bash', 'python', 'sql'],
  })
} catch (e) {
  errors.push(`Shiki 初始化失败：${e.message}`)
}

const md = new MarkdownIt({ html: false, linkify: false, typographer: false })
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx]
  const info = token.info.trim().split(/\s+/)[0] ?? ''
  const lang = LANG_MAP[info] ?? ''
  const label = lang ? (LANG_LABEL[lang] ?? lang) : 'text'
  let body
  let blockClass = 'code-block'
  if (lang && highlighter) {
    try {
      // 双主题输出：默认内联浅色值 + --shiki-dark CSS 变量，深色主题由样式表切换
      body = highlighter.codeToHtml(token.content, {
        lang,
        themes: { light: blueprintTheme, dark: blueprintDarkTheme },
        defaultColor: 'light',
      })
      // 行号：Shiki 按行输出 span.line；去行间换行后由 CSS 计数器编号（F3.5 可选项）
      body = body.replace(/(?<=<\/span>)\n(?=<span class="line")/g, '')
      blockClass = 'code-block line-numbers'
    } catch {
      body = `<pre class="code-plain"><code>${escapeHtml(token.content)}</code></pre>`
    }
  } else {
    body = `<pre class="code-plain"><code>${escapeHtml(token.content)}</code></pre>`
  }
  return `<figure class="${blockClass}" data-lang="${label}">` +
    `<figcaption class="code-head"><span class="code-lang">${label}</span>` +
    `<button class="code-copy" type="button">复制</button></figcaption>` +
    body + `</figure>\n`
}

const renderLesson = (raw) => {
  let html = md.render(raw)
  const toc = []
  let n = 0
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (m0, lvl, inner) => {
    const id = `sec-${++n}`
    toc.push({ id, text: inner.replace(/<[^>]+>/g, '').trim(), level: Number(lvl) })
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`
  })
  // 站内正文出现的绝对链接统一带安全属性（需求 §5 外链红线）
  html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"')
  return { html, toc }
}

// ---------------------------------------------------------------- 组装（派生字段）
// 课程：解析知识点元数据 + 前后链
const enrichedMeta = new Map() // lessonId → 注入归属/顺序字段后的完整 meta
const coursesOut = {}
for (const c of courses) {
  const flat = []
  const chapters = c.chapters.map((ch, i) => {
    const lessonMetas = ch.lessonIds.map((id) => ({ ...lessons.get(id).meta, chapterId: ch.id, chapterTitle: ch.title, chapterIndex: i }))
    flat.push(...lessonMetas)
    return { id: ch.id, title: ch.title, lessons: lessonMetas }
  })
  flat.forEach((lesson, i) => {
    lesson.courseId = c.id
    lesson.courseSlug = c.slug
    lesson.courseTitle = c.title
    lesson.domainSlug = c.domainSlug
    lesson.domainName = domainBySlug.get(c.domainSlug)?.name ?? ''
    lesson.index = i + 1
    lesson.total = flat.length
    const prev = flat[i - 1]
    const next = flat[i + 1]
    lesson.prev = prev ? { courseSlug: c.slug, lessonSlug: prev.slug, title: prev.title } : null
    lesson.next = next ? { courseSlug: c.slug, lessonSlug: next.slug, title: next.title } : null
    enrichedMeta.set(lesson.id, lesson)
  })
  const difficulties = flat.map((l) => l.difficulty)
  coursesOut[c.slug] = {
    id: c.id, slug: c.slug, domainSlug: c.domainSlug, title: c.title, summary: c.summary,
    difficulty: c.difficulty, audience: c.audience ?? '', prereqs: c.prereqs ?? '',
    chapters,
    lessonCount: flat.length,
    estMinutesTotal: flat.reduce((s, l) => s + l.estMinutes, 0),
    difficultySpan: difficulties.length ? [Math.min(...difficulties), Math.max(...difficulties)] : null,
  }
}

// 领域：派生课程数与难度跨度（coursesOut.difficultySpan 已按章节内知识点计算）
const domainsOut = domains.map((d) => {
  const dc = Object.values(coursesOut).filter((c) => c.domainSlug === d.slug)
  const lessonSpans = dc.flatMap((c) => c.difficultySpan ?? [])
  return {
    ...d,
    courseCount: dc.length,
    hasContent: dc.length > 0,
    difficultySpan: lessonSpans.length ? [Math.min(...lessonSpans), Math.max(...lessonSpans)] : null,
  }
})

// 路线：节点解析知识点引用
const pathsOut = {}
for (const p of paths) {
  let nodeCount = 0
  const stages = p.stages.map((s, i) => ({
    ...s,
    index: i + 1,
    items: (s.items ?? []).map((item) => {
      nodeCount += 1
      const lesson = lessons.get(item.lessonId)?.meta
      return {
        id: item.id,
        lessonId: item.lessonId,
        branch: item.branch ?? null,
        prereqs: item.prereqs ?? [],
        lesson: lesson
          ? { slug: lesson.slug, title: lesson.title, difficulty: lesson.difficulty, estMinutes: lesson.estMinutes, courseSlug: findCourseSlugOf(item.lessonId) }
          : null,
      }
    }),
  }))
  pathsOut[p.slug] = { ...p, stages, nodeCount }
}
function findCourseSlugOf(lessonId) {
  for (const c of courses) {
    if (c.chapters.some((ch) => ch.lessonIds.includes(lessonId))) return c.slug
  }
  return ''
}

// 知识点：正文编译（meta 用课程装配后的完整版，含 courseSlug/domainName/prev/next/index）。
// 正文按课程分片输出（gen/lessons/{courseId}.json）——客户端按需动态加载，
// 全量正文（数 MB）不再进主 bundle。孤儿知识点（未被任何课程引用）直接判错：
// 路线节点与搜索结果都需要 courseSlug 定位，无归属即断链。
const lessonsByCourse = new Map() // courseId -> Record<lessonId, { html, toc }>
const compiledLessons = new Map() // lessonId -> { html, toc }（搜索文档用）
for (const [id, lesson] of lessons) {
  const em = enrichedMeta.get(id)
  if (!em?.courseId) {
    errors.push(`lessons/${lesson.file}: 未被任何课程引用（孤儿知识点）——请挂到某门课程的章节`)
    continue
  }
  const { html, toc } = renderLesson(lesson.raw)
  const bucket = lessonsByCourse.get(em.courseId) ?? {}
  bucket[id] = { html, toc }
  lessonsByCourse.set(em.courseId, bucket)
  compiledLessons.set(id, { html, toc })
}

// ---------------------------------------------------------------- 校验：测验（F5 / F8.2）
const quizFiles = fs.existsSync(path.join(contentDir, 'quizzes'))
  ? fs.readdirSync(path.join(contentDir, 'quizzes')).filter((f) => f.endsWith('.json')).sort()
  : []
const quizIds = new Set()
const quizzesOut = {}
const quizByChapter = new Map()
const quizByCourse = new Map()
for (const file of quizFiles) {
  const q = readJSON(path.join(contentDir, 'quizzes', file))
  err(typeof q.id === 'string' && q.id, `quizzes/${file}: 缺少 id`)
  err(QUIZ_SCOPES.has(q.scopeType), `quizzes/${file}: scopeType 必须是 lesson/chapter/course：${q.id}`)
  err(Array.isArray(q.questions) && q.questions.length > 0, `quizzes/${file}: 题目为空：${q.id}`)
  err(!quizIds.has(q.id), `quizzes/${file}: id 重复：${q.id}`)
  quizIds.add(q.id)
  err(typeof q.title === 'string' && q.title, `quizzes/${file}: 缺少 title：${q.id}`)

  const qIds = new Set()
  for (const question of q.questions ?? []) {
    err(question.id && question.stem && Array.isArray(question.options) && question.options.length >= 2,
      `quizzes/${file}: 题目缺少 id/stem/options(≥2)：${question.id}`)
    err((question.options?.length ?? 0) <= 6,
      `quizzes/${file}: 题目 options 超过上限 6（可读性约束）：${question.id}`)
    err(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < (question.options?.length ?? 0),
      `quizzes/${file}: 题目 answer 下标越界：${question.id}`)
    err(typeof question.explanation === 'string' && question.explanation, `quizzes/${file}: 题目缺少解析：${question.id}`)
    err(!qIds.has(question.id), `quizzes/${file}: 题目 id 重复：${question.id}`)
    qIds.add(question.id)
    if (question.lessonId) {
      err(lessons.has(question.lessonId), `quizzes/${file}: 题目 lessonId 不存在：${question.lessonId}`)
    }
  }

  // scopeId 反查归属课程（scopeId 一律用实体 id：course id / chapter id / lesson id），
  // 并把章级/课程级测验挂回课程结构（章节末入口，F5.1）
  let courseSlug = ''
  if (q.scopeType === 'course') {
    const owner = courses.find((c) => c.id === q.scopeId)
    err(owner !== undefined, `quizzes/${file}: course 级测验 scopeId 不存在：${q.scopeId}`)
    if (owner) {
      courseSlug = owner.slug
      quizByCourse.set(owner.id, q.id)
    }
  } else if (q.scopeType === 'chapter') {
    const owner = courses.find((c) => c.chapters.some((ch) => ch.id === q.scopeId))
    err(owner !== undefined, `quizzes/${file}: chapter 级测验 scopeId 不存在：${q.scopeId}`)
    if (owner) {
      courseSlug = owner.slug
      quizByChapter.set(q.scopeId, q.id)
    }
  } else if (q.scopeType === 'lesson') {
    err(lessons.has(q.scopeId), `quizzes/${file}: lesson 级测验 scopeId 不存在：${q.scopeId}`)
    const owner = courses.find((c) => c.chapters.some((ch) => ch.lessonIds.includes(q.scopeId)))
    courseSlug = owner?.slug ?? ''
  }
  quizzesOut[q.id] = { ...q, courseSlug, courseTitle: courseSlug ? courseBySlug.get(courseSlug)?.title ?? '' : '' }
}

// 章节/课程反挂 quizId（CoursePage 章节末入口）
for (const c of Object.values(coursesOut)) {
  for (const ch of c.chapters) {
    const quizId = quizByChapter.get(ch.id)
    if (quizId) ch.quizId = quizId
  }
  const courseQuiz = quizByCourse.get(c.id)
  if (courseQuiz) c.quizId = courseQuiz
}

// ---------------------------------------------------------------- 路由清单（vite-ssg 预渲染）
const routesManifest = {
  domain: domainsOut.map((d) => `/domain/${d.slug}`),
  path: paths.map((p) => `/path/${p.slug}`),
  course: courses.map((c) => `/course/${c.slug}`),
  lesson: courses.flatMap((c) =>
    c.chapters.flatMap((ch) => ch.lessonIds.map((id) => `/course/${c.slug}/lesson/${lessons.get(id).meta.slug}`)),
  ),
  quiz: Object.keys(quizzesOut).map((id) => `/quiz/${id}`),
}

// ---------------------------------------------------------------- 搜索文档（F6.1/F6.3：标题+摘要+正文，前端内存检索）
// 正文检索（F6.3 P2 扩展落地）：编译后的 HTML 抽取纯文本（剥代码块/脚本/标签），
// 截断到 3000 字符控制索引体积；命中片段由前端在原始 body 上现场截取。
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }
const htmlToSearchBody = (html) =>
  html
    .replace(/<figure class="code-?block[\s\S]*?<\/figure>/g, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000)
const searchDocs = [
  ...domainsOut.map((d) => ({
    id: `domain:${d.slug}`,
    type: '领域',
    title: d.name,
    summary: d.summary,
    tags: '',
    extra: d.audience ?? '',
    crumb: `领域 · ${d.courseCount} 门课程`,
    url: `/domain/${d.slug}`,
    domainSlug: d.slug,
    difficulty: null,
    estMinutes: null,
  })),
  ...Object.values(coursesOut).map((c) => ({
    id: `course:${c.slug}`,
    type: '课程',
    title: c.title,
    summary: c.summary,
    tags: '',
    extra: `${domainBySlug.get(c.domainSlug)?.name ?? ''} ${c.audience}`,
    crumb: domainBySlug.get(c.domainSlug)?.name ?? '',
    url: `/course/${c.slug}`,
    domainSlug: c.domainSlug,
    difficulty: c.difficulty,
    estMinutes: c.estMinutesTotal,
  })),
  ...[...compiledLessons.keys()].flatMap((id) => {
    const l = compiledLessons.get(id)
    const meta = enrichedMeta.get(id)
    if (!l || !meta) return [] // 孤儿知识点：已在上方判错，不产出搜索文档
    return [{
      id: `lesson:${meta.id}`,
      type: '知识点',
      title: meta.title,
      summary: meta.summary,
      tags: meta.tags.join(' '),
      extra: `${meta.domainName ?? ''} ${meta.courseTitle ?? ''} ${meta.chapterTitle ?? ''}`,
      crumb: `${meta.domainName ?? ''} › ${meta.courseTitle ?? ''} › ${meta.chapterTitle ?? ''}`,
      url: `/course/${meta.courseSlug}/lesson/${meta.slug}`,
      domainSlug: meta.domainSlug ?? '',
      difficulty: meta.difficulty,
      estMinutes: meta.estMinutes,
      body: htmlToSearchBody(l.html),
    }]
  }),
]

// ---------------------------------------------------------------- 输出
// gen/ 全部为构建产物（gitignore）且直接进前端 bundle：一律 minify，不留缩进白字。
fs.mkdirSync(outDir, { recursive: true })
const write = (name, data) => fs.writeFileSync(path.join(outDir, name), JSON.stringify(data) + '\n')
write('domains.json', domainsOut)
write('site.json', site)
write('paths.json', pathsOut)
write('courses.json', coursesOut)
write('quizzes.json', quizzesOut)
write('search-docs.json', searchDocs)
write('routes-manifest.json', routesManifest)

// 正文按课程分片（客户端 import.meta.glob 动态加载）
const lessonsDir = path.join(outDir, 'lessons')
fs.mkdirSync(lessonsDir, { recursive: true })
for (const [courseId, bucket] of lessonsByCourse) {
  fs.writeFileSync(path.join(lessonsDir, `${courseId}.json`), JSON.stringify(bucket) + '\n')
}

// ---------------------------------------------------------------- 404.html（GitHub Pages 项目页桥页）
// catch-all 路由不参与预渲染，未匹配路径由托管方回退到此页；base 从 --site 注入，
// 保证项目页子路径（/cs-study/）下链接正确。文件属构建产物（gitignore）。
const siteUrl = argOf('--site', '')
const publicDir = path.resolve(outDir, '../../../public')
fs.mkdirSync(publicDir, { recursive: true })
// base 优先取 VITE_BASE（前端构建步骤都会注入，覆盖根目录先跑的 --site 生成），
// 其次取 --site 的路径部分；本地裸构建回退 '/'。与 sitemap「后写不降级」的行为对齐。
const rawBase = process.env.VITE_BASE || (siteUrl ? new URL(siteUrl).pathname : '')
const siteBase = !rawBase || rawBase === '/' ? '/' : `/${rawBase.replace(/^\/+|\/+$/g, '')}/`
fs.writeFileSync(
  path.join(publicDir, '404.html'),
  `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>404 · 页面不存在 · cs-study</title>
<style>
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: #f1f6fa; color: #14293d;
  font-family: 'PingFang SC','HarmonyOS Sans SC','MiSans','Source Han Sans SC','Noto Sans SC','Microsoft YaHei',system-ui,sans-serif; }
body::before { content: ''; position: fixed; inset: 0; pointer-events: none;
  background-image: linear-gradient(rgba(127,162,188,.14) 1px, transparent 1px),
    linear-gradient(90deg, rgba(127,162,188,.14) 1px, transparent 1px);
  background-size: 24px 24px; }
main { position: relative; max-width: 34em; padding: 48px 20px; text-align: center; }
.code { font-size: 72px; font-weight: 800; letter-spacing: .08em; color: #1b62a6; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.plate { display: inline-block; margin-top: 18px; padding: 26px 32px; background: #fff;
  border: 1px solid #7fa2bc; border-radius: 3px; box-shadow: 2px 2px 0 0 rgba(127,162,188,.4); }
h1 { font-size: 18px; margin: 0 0 6px; }
p { font-size: 13px; color: #52677c; margin: 0; line-height: 1.7; }
nav { margin-top: 22px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.btn { display: inline-block; padding: 8px 16px; font-size: 13px; text-decoration: none;
  border-radius: 3px; border: 1px solid #7fa2bc; background: #fff; color: #14293d; }
.btn.primary { background: #1b62a6; border-color: #1b62a6; color: #fff; }
.btn:hover { text-decoration: underline; }
footer { margin-top: 26px; font-size: 12px; color: #7e93a6; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
</style>
</head>
<body>
<main>
  <p class="code">404</p>
  <div class="plate">
    <h1>这张图纸上没有这一格</h1>
    <p>地址可能拼写有误，或内容已调整。回首页继续，或者去领域列表找要学的东西。</p>
    <nav>
      <a class="btn primary" href="${siteBase}">回首页</a>
      <a class="btn" href="${siteBase}explore">浏览全部领域</a>
      <a class="btn" href="${siteBase}search">搜索</a>
    </nav>
  </div>
  <footer>cs-study · 学习地图（纯前端版）</footer>
</main>
</body>
</html>
`,
)

// ---------------------------------------------------------------- sitemap.xml（传入 --site 时生成，F6/SEO）
if (siteUrl) {
  const base = siteUrl.replace(/\/$/, '')
  const staticPaths = ['/', '/explore', '/guide', '/profile', '/settings', '/search', '/mistakes']
  const dynamicPaths = Object.values(routesManifest).flat()
  const urlLines = [...staticPaths, ...dynamicPaths].map(
    (p) => `  <url><loc>${base}${p === '/' ? '/' : p}</loc></url>`,
  )
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlLines.join('\n')}\n</urlset>\n`
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap)
  console.log(`[content] sitemap.xml → ${urlLines.length} 条 URL（${siteUrl}）`)
}

// ---------------------------------------------------------------- 汇总
console.log(`[content] 领域 ${domains.length} · 路线 ${paths.length} · 课程 ${courses.length} · 知识点 ${lessons.size}（正文分片 ${lessonsByCourse.size} 门课程）· 测验 ${quizFiles.length}`)
console.log(`[content] 产出 → ${path.relative(repoRoot, outDir)}`)
for (const w of warnings) console.warn(`[content] ⚠ ${w}`)
for (const e of errors) console.error(`[content] ✕ ${e}`)
if (errors.length > 0) {
  console.error(`[content] 校验失败（${errors.length} 个错误），构建中止。`)
  process.exit(1)
}
console.log('[content] 校验通过 ✓')
