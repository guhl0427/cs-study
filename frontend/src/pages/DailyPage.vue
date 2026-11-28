<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { contentApi } from '@/api'
import { useUserDataStore } from '@/stores/userData'
import { useClientMounted } from '@/composables/useClientMounted'
import { usePageTitle } from '@/composables/usePageTitle'
import { useQuizKeys } from '@/composables/useQuizKeys'
import { isBlankCorrect } from '@/lib/quiz'
import { pickDailyQuestion, todayAnswerOf, type DailyQuestion } from '@/lib/daily'

usePageTitle('每日一题', '每天一道确定性抽取的题，到期错题优先——花一分钟保持手感。')

const ud = useUserDataStore()
const mounted = useClientMounted()

const daily = ref<DailyQuestion | null>(null)
const done = ref(false)
const correct = ref(false)
const selected = ref<number | null>(null)
const blankInput = ref('')

onMounted(() => {
  daily.value = pickDailyQuestion(contentApi.listQuizzes(), ud.answers)
  if (!daily.value) return
  const rec = todayAnswerOf(daily.value, ud.answers)
  if (rec) {
    done.value = true
    correct.value = rec.isCorrect
    if (typeof rec.answer === 'string') blankInput.value = rec.answer
    else selected.value = rec.answer
  }
})

const isBlankQ = computed(() => Boolean(daily.value?.question.blank))
const lessonLink = computed(() => {
  const meta = daily.value ? contentApi.getLessonById(daily.value.question.lessonId ?? '') : undefined
  if (!meta?.courseSlug) return null
  return { title: meta.title, to: { name: 'lesson', params: { courseSlug: meta.courseSlug, lessonSlug: meta.slug } } }
})

const optionLetter = (i: number) => String.fromCharCode(65 + i)
const optionCls = (i: number) => {
  if (!done.value) {
    return selected.value === i ? 'border-accent bg-accent-subtle text-accent font-semibold' : 'border-line text-ink hover:border-line-strong'
  }
  if (i === daily.value!.question.answer) return 'border-ok bg-ok-subtle text-ink font-semibold'
  if (selected.value === i) return 'border-danger bg-danger-subtle text-danger-text'
  return 'border-line text-ink-3'
}

function submit() {
  if (!daily.value || done.value) return
  const question = daily.value.question
  let answer: number | string
  let isCorrect: boolean
  if (question.blank) {
    if (!blankInput.value.trim()) return
    answer = blankInput.value
    isCorrect = isBlankCorrect(blankInput.value, question.blank)
  } else {
    if (selected.value === null) return
    answer = selected.value
    isCorrect = selected.value === question.answer
  }
  ud.recordAnswer({
    questionId: question.id,
    quizId: daily.value.quizId,
    answer,
    isCorrect,
    answeredAt: new Date().toISOString(),
  })
  done.value = true
  correct.value = isCorrect
}

useQuizKeys({
  enabled: () => Boolean(daily.value) && !done.value,
  optionsCount: () => (isBlankQ.value ? 0 : daily.value?.question.options?.length ?? 0),
  onSelect: (i) => {
    if (!done.value) selected.value = i
  },
  canSubmit: () =>
    !done.value && (isBlankQ.value ? blankInput.value.trim() !== '' : selected.value !== null),
  onSubmit: () => submit(),
  canNext: () => false,
  onNext: () => {},
})
</script>

<template>
  <div class="container-text pt-8">
    <PageHeader
      title="每日一题"
      subtitle="每天一道确定性抽取的题：到期错题优先，池空时从全题库抽。同一天刷新都是同一题。"
      :blocks="[{ label: '状态', value: done ? '今日已完成' : '待作答' }]"
    />

    <template v-if="mounted && daily">
      <section class="card-plate mt-6 p-5 sm:p-6" :key="daily.question.id">
        <p class="meta-mono mb-3">
          {{ done ? (correct ? '今日完成 · 回答正确 ✓' : '今日完成 · 已记录本次作答') : '今日题目 · 全程本机记录' }}
        </p>
        <h2 class="text-section font-bold text-ink">{{ daily.question.stem }}</h2>

        <!-- 选择题 -->
        <div v-if="!isBlankQ" class="mt-4 flex flex-col gap-2.5" role="radiogroup" aria-label="今日题目选项">
          <button
            v-for="(opt, i) in daily.question.options"
            :key="i"
            class="card-plate card-hover flex items-center gap-3 px-4 py-3 text-left border!"
            :class="optionCls(i)"
            type="button"
            role="radio"
            :aria-checked="selected === i"
            :disabled="done"
            @click="selected = i"
          >
            <span class="meta-mono shrink-0 font-bold">{{ optionLetter(i) }}</span>
            <span class="text-body-ui">{{ opt }}</span>
          </button>
          <p class="meta-mono mt-1">快捷键：1–{{ daily.question.options?.length }} 选择 · Enter 提交</p>
        </div>

        <!-- 填空题 -->
        <div v-else class="mt-4">
          <input
            v-model="blankInput"
            type="text"
            class="w-full rounded-card border border-line-strong bg-inset px-3 py-2.5 font-mono text-[15px] text-ink focus:border-accent"
            :class="done ? (correct ? 'border-ok' : 'border-danger') : ''"
            placeholder="把答案填在 ___ 处"
            :disabled="done"
            aria-label="填空作答"
            @keydown.enter.prevent="submit"
          />
          <p class="meta-mono mt-2">填空作答 · 判分忽略空格差异</p>
        </div>

        <div v-if="!done" class="mt-5">
          <button
            class="btn btn-primary"
            type="button"
            :disabled="isBlankQ ? !blankInput.trim() : selected === null"
            @click="submit"
          >
            提交答案
          </button>
        </div>

        <!-- 判分 + 解析 -->
        <div v-else class="mt-5 border-t border-dashed border-line pt-4">
          <p class="text-card font-bold" :class="correct ? 'text-ok' : 'text-danger-text'">
            {{
              correct
                ? '✓ 回答正确'
                : isBlankQ
                  ? `✕ 正确答案：${daily.question.blank?.answer ?? ''}`
                  : `✕ 正确答案：${optionLetter(daily.question.answer)}`
            }}
          </p>
          <div class="mt-2 rounded-node border-l-4 border-accent bg-accent-subtle px-4 py-3 text-body-ui text-ink">
            <b class="mr-1">解析</b>{{ daily.question.explanation }}
          </div>
          <div class="mt-4 flex flex-wrap items-center gap-3">
            <RouterLink v-if="lessonLink" :to="lessonLink.to" class="btn btn-text btn-sm">
              相关知识点：{{ lessonLink.title }}
            </RouterLink>
            <RouterLink to="/mistakes" class="btn btn-ghost btn-sm">查看错题本</RouterLink>
            <RouterLink to="/plan" class="btn btn-ghost btn-sm">继续本周计划</RouterLink>
          </div>
        </div>
      </section>

      <p class="meta-mono mt-4">来源：{{ daily.quizId }} · 明天会抽出新的一题</p>
    </template>

    <p v-else-if="mounted" class="meta-mono mt-6">题库加载后抽取今日题目…</p>
    <p v-else class="meta-mono mt-6">今日一题在页面加载后出现…</p>

    <EmptyState v-if="mounted && !daily" class="mt-6" emoji="📝" title="题库为空" desc="等有练习题后再来。" />

    <div class="h-6"></div>
  </div>
</template>
