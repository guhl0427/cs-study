#!/usr/bin/env node
/**
 * 内容脚手架（F8.5）：一键生成模板文件，降低内容生产成本。
 *
 * 用法：
 *   node tools/scaffold.mjs lesson --course c-web-frontend-basics --title "新知识点"
 *   node tools/scaffold.mjs course --domain frontend --title "新课程"
 *   node tools/scaffold.mjs path   --domain frontend --title "新路线"
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const contentDir = path.join(repoRoot, 'content')

const arg = (name) => {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const type = process.argv[2]
const title = arg('--title')
const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled'

if (type === 'lesson') {
  if (!title) { console.error('用法：node tools/scaffold.mjs lesson --title "标题" [--course 课程id]'); process.exit(1) }
  const slug = slugify(title)
  const id = `l-${slug}`
  const file = path.join(contentDir, 'lessons', `${id}.md`)
  if (fs.existsSync(file)) { console.error(`已存在：${file}`); process.exit(1) }
  const today = new Date().toISOString().slice(0, 10)
  fs.writeFileSync(
    file,
    `---
id: ${id}
slug: ${slug}
title: ${title}
difficulty: 1
estMinutes: 30
tags: [待定]
summary: 一句话摘要（列表与搜索用）
updated: ${today}
resources: []
---

> 一句话定义：这是什么、解决什么问题。

## 概念讲解

配图 / 类比，控制在初学者可读的篇幅。

## 代码示例

\`\`\`js
// 可运行、带注释
\`\`\`

## 常见坑

1. **坑 1：** 高频错误与排查思路。

## 小练习

1. 自测题一。
2. 自测题二。
`,
  )
  console.log(`✓ 已生成 lessons/${id}.md`)
  if (arg('--course')) {
    console.log(`下一步：把 "${id}" 加进 content/courses/${arg('--course')}.json 对应章节的 lessons 数组。`)
  }
} else if (type === 'course') {
  const domain = arg('--domain')
  if (!title || !domain) { console.error('用法：node tools/scaffold.mjs course --domain 领域slug --title "标题"'); process.exit(1) }
  const slug = slugify(title)
  const id = `c-${slug}`
  const file = path.join(contentDir, 'courses', `${id}.json`)
  fs.writeFileSync(
    file,
    `${JSON.stringify({
      id,
      domainSlug: domain,
      slug,
      title,
      summary: '课程一句话简介。',
      difficulty: 1,
      audience: '适合人群',
      prereqs: '前置要求',
      chapters: [{ id: `${id}-ch1`, title: '第一章', lessons: [] }],
    }, null, 2)}\n`,
  )
  console.log(`✓ 已生成 courses/${id}.json（chapters.lessons 里填 lesson id）`)
} else if (type === 'quiz') {
  // F8.4：题目批量导入——按章/课程生成题目数据模板，填好 options/answer/explanation 即可构建
  const scopeId = arg('--chapter') ?? arg('--course')
  const scopeType = arg('--chapter') ? 'chapter' : 'course'
  if (!scopeId || !title) {
    console.error('用法：node tools/scaffold.mjs quiz --chapter 章id --title "第 1 章随堂练习"')
    process.exit(1)
  }
  const id = `q-${scopeId}`
  const file = path.join(contentDir, 'quizzes', `${id}.json`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const today = new Date().toISOString().slice(0, 10)
  fs.writeFileSync(
    file,
    `${JSON.stringify({
      id,
      scopeType,
      scopeId,
      title,
      questions: [
        {
          id: `${id}-1`,
          stem: '题干（改为真实题目）',
          options: ['选项 A（改为正确选项）', '选项 B', '选项 C', '选项 D'],
          answer: 0,
          explanation: '解析：为什么选 A。附知识点链接的 lessonId 见下。',
          lessonId: 'l-对应知识点-id',
        },
        {
          id: `${id}-2`,
          stem: '第二题题干',
          options: ['选项 A', '选项 B（正确）', '选项 C'],
          answer: 1,
          explanation: '解析。',
          lessonId: 'l-对应知识点-id',
        },
      ],
      _meta: { generated: today, note: '删除 _meta 字段后再提交；answer 为正确选项下标（0 起）' },
    }, null, 2)}\n`,
  )
  console.log(`✓ 已生成 quizzes/${id}.json（scopeType=${scopeType}；填写后删除 _meta）`)
} else if (type === 'path') {
  const domain = arg('--domain')
  if (!title || !domain) { console.error('用法：node tools/scaffold.mjs path --domain 领域slug --title "标题"'); process.exit(1) }
  const slug = `${slugify(title)}-path`
  const id = `p-${slug.replace(/-path$/, '')}`
  const file = path.join(contentDir, 'paths', `${id}.json`)
  fs.writeFileSync(
    file,
    `${JSON.stringify({
      id,
      slug,
      domainSlug: domain,
      name: title,
      description: '路线一句话说明。',
      targetAudience: '适合人群',
      stages: [{ id: `${id}-s1`, name: '阶段一', description: '', suggestDuration: '1–2 周', items: [] }],
    }, null, 2)}\n`,
  )
  console.log(`✓ 已生成 paths/${id}.json（stages[].items 里填节点）`)
} else {
  console.error('未知类型：lesson | course | path | quiz')
  process.exit(1)
}
