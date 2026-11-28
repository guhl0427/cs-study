<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { contentApi } from '@/api'
import { useUserDataStore } from '@/stores/userData'
import { useClientMounted } from '@/composables/useClientMounted'
import { usePageTitle } from '@/composables/usePageTitle'
import { formatDate } from '@/lib/format'
import type { AnswerRecord } from '@/types/user'
import type { QuizQuestion } from '@/types/content'

usePageTitle('错题本')

const ud = useUserDataStore()
const mounted = useClientMounted()

/* ---- 题目索引：questionId → {question, quizId} ---- */
const questionIndex = computed(() => {
  const map = new Map<string, { question: QuizQuestion; quizId: string }>()
  for (const quiz of contentApi.listQuizzes()) {
    for (const q of quiz.questions) map.set(q.id, { question: q, quizId: quiz.id })
  }
  return map
})

/* ---- 每题最新作答决定状态（F5.3：答错进本、重做答对即「已重做」） ---- */
const latestByQuestion = computed(() => {
  const latest = new Map<string, AnswerRecord>()
  for (const rec of ud.answers) {
    latest.set(rec.questionId, rec) // answers 按时间正序存放（FIFO），后写覆盖
  }
  return latest
})

interface MistakeEntry {
  questionId: string
  stem: string
  quizId: string
  answeredAt: string
  redone: boolean
}

const entries = computed<MistakeEntry[]>(() => {
  if (!mounted.value) return []
  const out: MistakeEntry[] = []
  for (const [questionId, rec] of latestByQuestion.value) {
    const hit = questionIndex.value.get(questionId)
    if (!hit?.question.lessonId) continue // 无归属知识点的题目不进错题本列表
    out.push({
      questionId,
      stem: hit.question.stem,
      quizId: hit.quizId,
      answeredAt: rec.answeredAt,
      redone: rec.isCorrect,
    })
  }
  return out.sort((a, b) => b.answeredAt.localeCompare(a.answeredAt))
})

/* ---- 过滤（全部 / 未重做 / 已重做） + 按知识点分组 ---- */
const tab = ref<'all' | 'undone' | 'redone'>('all')

const filtered = computed(() =>
  entries.value.filter((e) =>
    tab.value === 'all' ? true : tab.value === 'undone' ? !e.redone : e.redone,
  ),
)

const groups = computed(() => {
  const byLesson = new Map<string, MistakeEntry[]>()
  for (const e of filtered.value) {
    const title = contentApi.getLessonById(
      questionIndex.value.get(e.questionId)?.question.lessonId ?? '',
    )?.title
    const key = title ?? '未关联知识点'
    if (!byLesson.has(key)) byLesson.set(key, [])
    byLesson.get(key)!.push(e)
  }
  return [...byLesson.entries()].map(([title, items]) => ({ title, items }))
})

const stats = computed(() => ({
  total: entries.value.length,
  undone: entries.value.filter((e) => !e.redone).length,
}))
</script>

<template>
  <div class="container-text pt-8">
    <PageHeader title="错题本" subtitle="答错的题都在这里，重做对了就标记为已重做。随导出/导入一起迁移。" />

    <!-- 过滤行 + 统计 -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div class="flex items-center gap-1 rounded-card border border-line bg-surface p-0.5" role="group" aria-label="按状态过滤">
        <button
          v-for="t in ['all', 'undone', 'redone'] as const"
          :key="t"
          class="rounded-node px-3 py-1 text-[12px] font-medium"
          :class="tab === t ? 'bg-accent-subtle text-accent' : 'text-ink-2'"
          type="button"
          @click="tab = t"
        >
          {{ t === 'all' ? '全部' : t === 'undone' ? '未重做' : '已重做' }}
        </button>
      </div>
      <p class="meta-mono">共 {{ stats.total }} 题 · 未重做 {{ stats.undone }} 题</p>
      <p v-if="mounted && ud.answers.length >= 500" class="meta-mono text-warn">
        作答记录已达上限（500），最早的记录将被滚动清除
      </p>
    </div>

    <!-- 按知识点分组列表 -->
    <section v-if="groups.length" class="mt-6 space-y-4" aria-label="错题列表">
      <div v-for="g in groups" :key="g.title" class="card-plate overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-muted px-4 py-3">
          <h2 class="text-card font-bold text-ink">{{ g.title }}（{{ g.items.length }} 题）</h2>
          <RouterLink :to="`/quiz/${g.items[0].quizId}`" class="btn btn-ghost btn-sm">重做本组</RouterLink>
        </div>
        <ul class="m-0 list-none p-0">
          <li v-for="e in g.items" :key="e.questionId" class="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line px-4 py-3 last:border-b-0">
            <span class="text-danger-text font-bold" aria-hidden="true">✕</span>
            <span class="min-w-0 flex-1 truncate text-body-ui text-ink">{{ e.stem }}</span>
            <span
              class="rounded-node border px-2 py-0.5 text-[12px] leading-none"
              :class="e.redone ? 'border-ok bg-ok-subtle text-ok' : 'border-dashed border-line text-ink-2'"
            >
              {{ e.redone ? '已重做' : '未重做' }}
            </span>
            <span class="meta-mono">上次作答 {{ formatDate(e.answeredAt) }}</span>
            <RouterLink :to="`/quiz/${e.quizId}`" class="btn btn-text btn-sm shrink-0">重做</RouterLink>
          </li>
        </ul>
      </div>
    </section>

    <EmptyState
      v-else
      class="mt-6"
      emoji="📕"
      title="错题本是空的"
      desc="去完成一次章节练习，答错的题会自动出现在这里。"
    >
      <RouterLink to="/course/web-frontend-basics" class="btn btn-ghost btn-sm">去看课程练习</RouterLink>
    </EmptyState>

    <div class="h-6"></div>
  </div>
</template>
