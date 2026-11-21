#!/usr/bin/env node
/**
 * 内容构建脚本（F8.2 内容工程化）
 * ---------------------------------------------------------------
 * 1. 校验 content/：frontmatter schema、slug 全局唯一、引用完整性
 *    （课程→知识点、路线→知识点、站点配置→路线/课程）、外链 URL 格式
 * 2. 把知识点 Markdown 构建期编译为 HTML（markdown-it + Shiki
 *    自定义主题 blueprint-draft，对齐 design/tokens.md §9）
 * 3. 产出 frontend/src/content/gen/：
 *    domains.json / site.json / paths.json / courses.json / lessons.json
 *    routes-manifest.json（vite-ssg includedRoutes 预渲染清单）
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
let highlighter
try {
  highlighter = await createHighlighter({
    themes: [blueprintTheme],
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
  if (lang && highlighter) {
    try {
      body = highlighter.codeToHtml(token.content, { lang, theme: 'Blueprint Draft' })
    } catch {
      body = `<pre class="code-plain"><code>${escapeHtml(token.content)}</code></pre>`
    }
  } else {
    body = `<pre class="code-plain"><code>${escapeHtml(token.content)}</code></pre>`
  }
  return `<figure class="code-block" data-lang="${label}">` +
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

// 知识点：正文编译（meta 用课程装配后的完整版，含 courseSlug/domainName/prev/next/index）
const lessonsOut = {}
for (const [id, lesson] of lessons) {
  const { html, toc } = renderLesson(lesson.raw)
  lessonsOut[id] = { meta: enrichedMeta.get(id) ?? lesson.meta, html, toc }
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

// ---------------------------------------------------------------- 搜索文档（F6.1：构建期生成，前端内存检索）
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
  ...Object.values(lessonsOut).map((l) => ({
    id: `lesson:${l.meta.id}`,
    type: '知识点',
    title: l.meta.title,
    summary: l.meta.summary,
    tags: l.meta.tags.join(' '),
    extra: `${l.meta.domainName ?? ''} ${l.meta.courseTitle ?? ''} ${l.meta.chapterTitle ?? ''}`,
    crumb: `${l.meta.domainName ?? ''} › ${l.meta.courseTitle ?? ''} › ${l.meta.chapterTitle ?? ''}`,
    url: `/course/${l.meta.courseSlug}/lesson/${l.meta.slug}`,
    domainSlug: l.meta.domainSlug ?? '',
    difficulty: l.meta.difficulty,
    estMinutes: l.meta.estMinutes,
  })),
]

// ---------------------------------------------------------------- 输出
fs.mkdirSync(outDir, { recursive: true })
const write = (name, data) => fs.writeFileSync(path.join(outDir, name), JSON.stringify(data, null, 2) + '\n')
write('domains.json', domainsOut)
write('site.json', site)
write('paths.json', pathsOut)
write('courses.json', coursesOut)
write('lessons.json', lessonsOut)
write('quizzes.json', quizzesOut)
write('search-docs.json', searchDocs)
write('routes-manifest.json', routesManifest)

// ---------------------------------------------------------------- sitemap.xml（传入 --site 时生成，F6/SEO）
const siteUrl = argOf('--site', '')
if (siteUrl) {
  const base = siteUrl.replace(/\/$/, '')
  const staticPaths = ['/', '/explore', '/guide', '/profile', '/settings', '/search', '/mistakes']
  const dynamicPaths = Object.values(routesManifest).flat()
  const urlLines = [...staticPaths, ...dynamicPaths].map(
    (p) => `  <url><loc>${base}${p === '/' ? '/' : p}</loc></url>`,
  )
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlLines.join('\n')}\n</urlset>\n`
  const publicDir = path.resolve(outDir, '../../../public')
  fs.mkdirSync(publicDir, { recursive: true })
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap)
  console.log(`[content] sitemap.xml → ${urlLines.length} 条 URL（${siteUrl}）`)
}

// ---------------------------------------------------------------- 汇总
console.log(`[content] 领域 ${domains.length} · 路线 ${paths.length} · 课程 ${courses.length} · 知识点 ${lessons.size} · 测验 ${quizFiles.length}`)
console.log(`[content] 产出 → ${path.relative(repoRoot, outDir)}`)
for (const w of warnings) console.warn(`[content] ⚠ ${w}`)
for (const e of errors) console.error(`[content] ✕ ${e}`)
if (errors.length > 0) {
  console.error(`[content] 校验失败（${errors.length} 个错误），构建中止。`)
  process.exit(1)
}
console.log('[content] 校验通过 ✓')
