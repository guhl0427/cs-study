<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import { contentApi } from '@/api'
import { useUserDataStore } from '@/stores/userData'
import { usePageTitle } from '@/composables/usePageTitle'

usePageTitle('找方向')

const router = useRouter()
const ud = useUserDataStore()

/* ---- 三题固定选项（文案与需求 F1.2 一致，不得改写） ---- */
interface Option {
  id: string
  label: string
  desc: string
}
interface Question {
  key: 'interest' | 'level' | 'time'
  title: string
  options: Option[]
}

const questions: Question[] = [
  {
    key: 'interest',
    title: '你更想做哪类东西？',
    options: [
      { id: 'frontend', label: '做网站页面', desc: '前端开发——可视化反馈强，就业方向之一' },
      { id: 'backend', label: '做系统与数据', desc: '后端开发——系统逻辑与数据流转' },
      { id: 'ai', label: '数据与智能', desc: 'AI 与数据——新兴热门方向' },
      { id: 'cs', label: '打好基础', desc: '计算机基础——决定天花板的地基' },
      { id: 'unsure', label: '还不确定', desc: '先打基础，边学边找感觉' },
    ],
  },
  {
    key: 'level',
    title: '你现在的基础？',
    options: [
      { id: 'none', label: '完全零基础', desc: '还没写过代码' },
      { id: 'some', label: '会一点编程', desc: '学过语法或写过小脚本' },
      { id: 'major', label: '修过专业课', desc: 'CS 在校生或有系统学习经历' },
    ],
  },
  {
    key: 'time',
    title: '每周能投入多少时间？',
    options: [
      { id: 'low', label: '5 小时以内', desc: '节奏慢一点，不贪多' },
      { id: 'mid', label: '5–10 小时', desc: '标准节奏' },
      { id: 'high', label: '10 小时以上', desc: '可以双线并行' },
    ],
  },
]

const step = ref(0) // 0-2 答题；3 = 结果页
const answers = reactive<Record<string, string>>({})

/* ---- 匹配逻辑（纯前端映射表；同答案结果可复现） ---- */
interface Recommendation {
  domainName: string
  pathSlug: string
  pathName: string
  startLabel: string
  startTo: { name: 'lesson'; params: { courseSlug: string; lessonSlug: string } } | null
  timeAdvice: string
  note?: string
}

const startOf = (lessonSlug: string): Recommendation['startTo'] => {
  // 在全部路线节点里反查该知识点归属课程
  for (const p of contentApi.listPaths()) {
    for (const s of p.stages) {
      for (const it of s.items) {
        if (it.lesson?.slug === lessonSlug && it.lesson.courseSlug) {
          return { name: 'lesson', params: { courseSlug: it.lesson.courseSlug, lessonSlug } }
        }
      }
    }
  }
  return null
}

const result = computed<Recommendation | null>(() => {
  if (step.value < 3) return null
  const interest = answers.interest
  const level = answers.level

  const timeAdvice =
    answers.time === 'low'
      ? '按最少节奏走，别跳阶段'
      : answers.time === 'high'
        ? '可双线并行（如语言 + 计算机基础）'
        : '标准节奏，阶段内可并行'

  if (interest === 'frontend') {
    const startSlug = level === 'none' ? 'doc-structure' : level === 'some' ? 'syntax-dom' : 'promise-async'
    const p = contentApi.getPath('frontend-path')
    return {
      domainName: '前端开发',
      pathSlug: 'frontend-path',
      pathName: p?.name ?? '前端开发路线',
      startLabel:
        p?.stages.flatMap((s) => s.items).find((i) => i.lesson?.slug === startSlug)?.lesson?.title ?? startSlug,
      startTo: startOf(startSlug),
      timeAdvice,
    }
  }
  if (interest === 'cs' || interest === 'unsure') {
    return {
      domainName: '计算机基础',
      pathSlug: 'cs-fundamentals-path',
      pathName: contentApi.getPath('cs-fundamentals-path')?.name ?? '计算机基础路线',
      startLabel: '分层模型：OSI 与 TCP/IP',
      startTo: startOf('layered-model'),
      timeAdvice,
      note: interest === 'unsure' ? '方向未定时先打基础，是最稳的起点。' : undefined,
    }
  }
  if (interest === 'backend') {
    return {
      domainName: '后端开发',
      pathSlug: 'backend-path',
      pathName: contentApi.getPath('backend-path')?.name ?? '后端开发路线',
      startLabel: 'RESTful API 设计',
      startTo: startOf('rest'),
      timeAdvice,
      note: '零基础先修「Python 入门」或「计算机基础」，再进入本路线。',
    }
  }
  // ai：AI 与数据方向内容筹备中，共同起点是 Python 与计算机基础
  return {
    domainName: 'AI 与数据',
    pathSlug: 'languages-path',
    pathName: contentApi.getPath('languages-path')?.name ?? '编程语言路线',
    startLabel: 'Python 语法速览：变量、控制流与函数',
    startTo: startOf('py-syntax'),
    timeAdvice,
    note: 'AI 与数据方向的内容筹备中——它的前置是 Python，先从这里起步。',
  }
})

function pick(q: Question, optionId: string) {
  answers[q.key] = optionId
  step.value += 1
  if (step.value === 3 && result.value) {
    ud.saveGuideResult({
      answers: { interest: answers.interest, level: answers.level, time: answers.time },
      recommendedPathSlug: result.value.pathSlug,
      completedAt: new Date().toISOString(),
    })
  }
}

function back() {
  if (step.value > 0) step.value -= 1
}

function startByPath() {
  if (!result.value) return
  ud.setActivePath(result.value.pathSlug)
  router.push(`/path/${result.value.pathSlug}`)
}

function restart() {
  step.value = 0
  delete answers.interest
  delete answers.level
  delete answers.time
}
</script>

<template>
  <div class="container-text pt-8">
    <PageHeader
      title="找方向"
      subtitle="3 道题，约 1 分钟。选兴趣方向 → 说当前基础 → 填每周时间，输出推荐领域、路线与起步知识点。"
    />

    <!-- 问答态 -->
    <section v-if="step < 3" class="grid-zone rounded-card border border-line-strong p-5 sm:p-7">
      <p class="meta-mono">第 {{ step + 1 }} / {{ questions.length }} 题</p>
      <h2 class="text-section mt-2 font-bold text-ink">{{ questions[step].title }}</h2>

      <div class="mt-4 flex flex-col gap-2.5">
        <button
          v-for="opt in questions[step].options"
          :key="opt.id"
          class="card-plate card-hover flex items-center gap-3 px-4 py-3 text-left"
          type="button"
          @click="pick(questions[step], opt.id)"
        >
          <b class="shrink-0 text-body-ui text-ink">{{ opt.label }}</b>
          <span class="text-[13px] text-ink-2">{{ opt.desc }}</span>
        </button>
      </div>

      <button v-if="step > 0" class="btn btn-text btn-sm mt-4" type="button" @click="back">← 返回上一题</button>
    </section>

    <!-- 结果页 -->
    <section v-else-if="result" class="grid-zone rounded-card border border-line-strong p-5 sm:p-7">
      <p class="meta-mono">推荐结果 · 已保存在本机，可在个人中心查看或重测</p>

      <div class="mt-4 grid grid-cols-2 gap-px border border-line-strong bg-line-strong sm:grid-cols-4">
        <div class="bg-surface px-3.5 py-2">
          <span class="block text-[11px] text-ink-2">匹配领域</span>
          <b class="mt-0.5 block text-[13px] font-medium text-ink">{{ result.domainName }}</b>
        </div>
        <div class="bg-surface px-3.5 py-2">
          <span class="block text-[11px] text-ink-2">推荐路线</span>
          <b class="mt-0.5 block text-[13px] font-medium text-ink">{{ result.pathName }}</b>
        </div>
        <div class="bg-surface px-3.5 py-2">
          <span class="block text-[11px] text-ink-2">起步知识点</span>
          <b class="mt-0.5 block text-[13px] font-medium text-ink">{{ result.startLabel }}</b>
        </div>
        <div class="bg-surface px-3.5 py-2">
          <span class="block text-[11px] text-ink-2">每周节奏</span>
          <b class="mt-0.5 block text-[13px] font-medium text-ink">{{ result.timeAdvice }}</b>
        </div>
      </div>

      <p
        v-if="result.note"
        class="mt-4 rounded-node border-l-4 border-warn bg-warn-subtle px-4 py-2.5 text-[13px] text-warn"
      >
        {{ result.note }}
      </p>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <button class="btn btn-primary" type="button" @click="startByPath">按此路线开始学习</button>
        <RouterLink v-if="result.startTo" :to="result.startTo" class="btn btn-ghost">
          直达起点：{{ result.startLabel }}
        </RouterLink>
        <button class="btn btn-text" type="button" @click="restart">重新测一测</button>
      </div>
    </section>
  </div>
</template>
