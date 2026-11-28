<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ProgressTier from '@/components/progress/ProgressTier.vue'
import { contentApi } from '@/api'
import { useUserDataStore } from '@/stores/userData'
import { usePageTitle } from '@/composables/usePageTitle'
import { useQuizKeys } from '@/composables/useQuizKeys'
import { isBlankCorrect } from '@/lib/quiz'
import type { QuizQuestion } from '@/types/content'

const route = useRoute()
const id = String(route.params.id)
const quiz = contentApi.getQuiz(id)

usePageTitle(quiz?.title ?? '自测')

const ud = useUserDataStore()

/* ---- 关联信息（章节/课程归属） ---- */
const chapterTitle = computed(() => {
  if (!quiz || quiz.scopeType !== 'chapter' || !quiz.courseSlug) return ''
  return contentApi.getCourse(quiz.courseSlug)?.chapters.find((ch) => ch.id === quiz.scopeId)?.title ?? ''
})
const crumb = computed(() => {
  if (!quiz) return ''
  const parts = [quiz.courseTitle ?? '']
  if (chapterTitle.value) parts.push(chapterTitle.value)
  return parts.filter(Boolean).join(' › ')
})
const courseLink = computed(() => (quiz?.courseSlug ? `/course/${quiz.courseSlug}` : ''))

/* ---- 作答状态机（F5.1/F5.4：单题逐题，选择题 + 填空题两种形态） ---- */
interface SessionResult {
  question: QuizQuestion
  answer: number | string
  isCorrect: boolean
}
const session = ref<SessionResult[]>([])
const idx = ref(0)
const selected = ref<number | null>(null)
const blankInput = ref('')
const submitted = ref(false)

const pool = computed<QuizQuestion[]>(() => (quiz ? poolOverride.value ?? quiz.questions : []))
const poolOverride = ref<QuizQuestion[] | null>(null) // 「重做本组」= 仅错题
const finished = computed(() => pool.value.length > 0 && idx.value >= pool.value.length)
const question = computed(() => pool.value[idx.value])
const isBlankQ = computed(() => Boolean(question.value?.blank))

const progress = computed(() =>
  pool.value.length === 0 ? 0 : Math.round((idx.value / pool.value.length) * 100),
)
const accuracy = computed(() => {
  const total = session.value.length
  return total === 0 ? 0 : Math.round((session.value.filter((r) => r.isCorrect).length / total) * 100)
})
const wrongOnes = computed(() => session.value.filter((r) => !r.isCorrect))

/* 选项字母随下标生成（构建期校验 options ≤ 6，这里按需扩展到 26，避免硬编码数组越界显示 undefined） */
const optionLetter = (i: number) => String.fromCharCode(65 + i)

const optionCls = (i: number) => {
  if (!submitted.value) {
    return selected.value === i ? 'border-accent bg-accent-subtle text-accent font-semibold' : 'border-line text-ink hover:border-line-strong'
  }
  if (i === question.value.answer) return 'border-ok bg-ok-subtle text-ink font-semibold'
  if (selected.value === i) return 'border-danger bg-danger-subtle text-danger-text'
  return 'border-line text-ink-3'
}

function submit() {
  if (!question.value || submitted.value) return
  let answer: number | string
  let isCorrect: boolean
  if (question.value.blank) {
    if (!blankInput.value.trim()) return
    answer = blankInput.value
    isCorrect = isBlankCorrect(blankInput.value, question.value.blank)
  } else {
    if (selected.value === null) return
    answer = selected.value
    isCorrect = selected.value === question.value.answer
  }
  submitted.value = true
  session.value.push({ question: question.value, answer, isCorrect })
  // 作答记录本地持久化（F5 说明 3；错题本数据源）
  ud.recordAnswer({
    questionId: question.value.id,
    quizId: quiz?.id,
    answer,
    isCorrect,
    answeredAt: new Date().toISOString(),
  })
}

function next() {
  idx.value += 1
  selected.value = null
  blankInput.value = ''
  submitted.value = false
}

/* 重做 = 仅重做本次答错的题（F5.3 / 11-quiz.md 完成页） */
function redoWrong() {
  poolOverride.value = wrongOnes.value.map((r) => r.question)
  restart()
}

function restartAll() {
  poolOverride.value = null
  restart()
}

function restart() {
  session.value = []
  idx.value = 0
  selected.value = null
  blankInput.value = ''
  submitted.value = false
}

/* ---- 键盘作答（1–N 选择、Enter 提交/下一题；填空题输入框聚焦时不拦截） ---- */
useQuizKeys({
  enabled: () => Boolean(quiz) && !finished.value,
  optionsCount: () => (isBlankQ.value ? 0 : question.value?.options?.length ?? 0),
  onSelect: (i) => {
    if (!submitted.value) selected.value = i
  },
  canSubmit: () =>
    !submitted.value && (isBlankQ.value ? blankInput.value.trim() !== '' : selected.value !== null),
  onSubmit: () => submit(),
  canNext: () => submitted.value,
  onNext: () => next(),
})

const lessonLink = (lessonId?: string) => {
  if (!lessonId) return null
  const meta = contentApi.getLessonById(lessonId)
  if (!meta?.courseSlug) return null
  return { title: meta.title, to: { name: 'lesson', params: { courseSlug: meta.courseSlug, lessonSlug: meta.slug } } }
}
</script>

<template>
  <div class="container-text pt-8">
    <template v-if="quiz">
      <PageHeader :title="quiz.title" :subtitle="crumb" />

      <!-- ① 进度行 -->
      <section v-if="!finished" class="mb-6">
        <ProgressTier :percent="progress" :label="`自测进度：第 ${Math.min(idx + 1, pool.length)} / ${pool.length} 题`" />
        <p class="meta-mono mt-1.5">第 {{ Math.min(idx + 1, pool.length) }} / {{ pool.length }} 题</p>
      </section>

      <!-- ② 作答卡（单题逐题） -->
      <section v-if="question && !finished" class="card-plate p-5 sm:p-6" :key="question.id">
        <h2 class="text-section font-bold text-ink">{{ question.stem }}</h2>

        <!-- 选择题选项（填空题走下方输入分支） -->
        <div v-if="!isBlankQ" class="mt-4 flex flex-col gap-2.5" role="radiogroup" :aria-label="`第 ${idx + 1} 题选项`">
          <button
            v-for="(opt, i) in question.options"
            :key="i"
            class="card-plate card-hover flex items-center gap-3 px-4 py-3 text-left border!"
            :class="optionCls(i)"
            type="button"
            role="radio"
            :aria-checked="selected === i"
            :disabled="submitted"
            @click="selected = i"
          >
            <span class="meta-mono shrink-0 font-bold">{{ optionLetter(i) }}</span>
            <span class="text-body-ui">{{ opt }}</span>
          </button>
          <p class="meta-mono mt-1">快捷键：1–{{ question.options?.length }} 选择 · Enter 提交 / 下一题</p>
        </div>

        <!-- 填空题（F5.4）：题干 ___ 占位，本地判分 -->
        <div v-else class="mt-4">
          <input
            v-model="blankInput"
            type="text"
            class="w-full rounded-card border border-line-strong bg-inset px-3 py-2.5 font-mono text-[15px] text-ink focus:border-accent"
            :class="submitted ? (session.at(-1)?.isCorrect ? 'border-ok' : 'border-danger') : ''"
            placeholder="把答案填在 ___ 处"
            :disabled="submitted"
            aria-label="填空作答"
            @keydown.enter.prevent="submit"
          />
          <p class="meta-mono mt-2">填空作答 · 判分忽略空格差异 · 回车或点「提交答案」</p>
        </div>

        <div v-if="!submitted" class="mt-5">
          <button
            class="btn btn-primary"
            type="button"
            :disabled="isBlankQ ? !blankInput.trim() : selected === null"
            @click="submit"
          >
            提交答案
          </button>
        </div>

        <!-- 判分 + 解析（提交后展开） -->
        <div v-else class="mt-5 border-t border-dashed border-line pt-4">
          <p class="text-card font-bold" :class="session.at(-1)?.isCorrect ? 'text-ok' : 'text-danger-text'">
            {{
              session.at(-1)?.isCorrect
                ? '✓ 回答正确'
                : isBlankQ
                  ? `✕ 回答错误，正确答案：${question.blank?.answer ?? ''}`
                  : `✕ 回答错误，正确答案：${optionLetter(question.answer)}`
            }}
          </p>
          <div class="mt-2 rounded-node border-l-4 border-accent bg-accent-subtle px-4 py-3 text-body-ui text-ink">
            <b class="mr-1">解析</b>{{ question.explanation }}
          </div>
          <div class="mt-4 flex flex-wrap items-center gap-3">
            <button v-if="idx < pool.length - 1" class="btn btn-primary" type="button" @click="next">下一题</button>
            <button v-else class="btn btn-primary" type="button" @click="next">查看结果</button>
            <RouterLink v-if="lessonLink(question.lessonId)" :to="lessonLink(question.lessonId)!.to" class="btn btn-text btn-sm">
              相关知识点：{{ lessonLink(question.lessonId)!.title }}
            </RouterLink>
          </div>
        </div>
      </section>

      <!-- ③ 完成页：正确率 + 薄弱知识点 -->
      <section v-else-if="finished" class="grid-zone rounded-card border border-line-strong p-6 sm:p-8 text-center">
        <p class="meta-mono">自测完成 · 全程本机记录</p>
        <b class="mt-3 block text-5xl font-extrabold text-accent">{{ accuracy }}%</b>
        <p class="mt-1 text-body-ui text-ink-2">
          正确率 · {{ session.filter((r) => r.isCorrect).length }} / {{ session.length }} 题
        </p>

        <div v-if="wrongOnes.length" class="mt-6 rounded-card border border-warn bg-warn-subtle px-4 py-3 text-left">
          <p class="text-[13px] font-bold text-warn">薄弱知识点（{{ wrongOnes.length }} 个）</p>
          <ul class="mt-2 list-none space-y-1.5 p-0">
            <li v-for="r in wrongOnes" :key="r.question.id" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <span class="text-ink">{{ r.question.stem.slice(0, 24) }}…</span>
              <RouterLink v-if="lessonLink(r.question.lessonId)" :to="lessonLink(r.question.lessonId)!.to" class="text-accent underline underline-offset-2">
                去复习：{{ lessonLink(r.question.lessonId)!.title }}
              </RouterLink>
            </li>
          </ul>
        </div>

        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button v-if="wrongOnes.length" class="btn btn-primary" type="button" @click="redoWrong">重做错题</button>
          <button class="btn btn-ghost" type="button" @click="restartAll">重做全部</button>
          <RouterLink to="/mistakes" class="btn btn-ghost">查看错题本</RouterLink>
          <RouterLink v-if="courseLink" :to="courseLink" class="btn btn-text">返回课程</RouterLink>
        </div>
      </section>
    </template>

    <EmptyState v-else emoji="📝" title="自测不存在" desc="这份练习可能已调整，回课程页找入口。">
      <RouterLink to="/explore" class="btn btn-primary btn-sm">浏览全部领域</RouterLink>
    </EmptyState>

    <div class="h-6"></div>
  </div>
</template>
