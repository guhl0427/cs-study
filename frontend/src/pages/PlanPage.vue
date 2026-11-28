<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { contentApi } from '@/api'
import { useUserDataStore } from '@/stores/userData'
import { useClientMounted } from '@/composables/useClientMounted'
import { usePageTitle } from '@/composables/usePageTitle'
import { buildWeeklyPlan, defaultWeeklyMinutes } from '@/lib/plan'
import { lessonState } from '@/lib/progress'
import { formatMinutes } from '@/lib/format'

usePageTitle('本周计划', '按你的路线与每周可用时间推导本周该学的知识点，完成自动顺延。')

const ud = useUserDataStore()
const mounted = useClientMounted()
const paths = contentApi.listPaths()

const BUDGET_OPTIONS = [120, 180, 240, 300, 420, 540, 720, 900]

/** 计划来源：显式选定的路线 > 找方向推荐 > 零基础快捷路线 */
const sourceSlug = computed(
  () => ud.profile.activePathId ?? ud.guide?.recommendedPathSlug ?? 'cs-fundamentals-path',
)
const selectedSlug = ref('')
onMounted(() => {
  selectedSlug.value = sourceSlug.value
})
const activeSlug = computed(() => selectedSlug.value || sourceSlug.value)
const path = computed(() => contentApi.getPath(activeSlug.value))
const budget = computed(() => ud.profile.weeklyMinutes ?? defaultWeeklyMinutes(ud.guide?.answers.time))
const plan = computed(() =>
  mounted.value && path.value ? buildWeeklyPlan(path.value, ud.progress, budget.value) : null,
)

function onPathChange(e: Event) {
  const slug = (e.target as HTMLSelectElement).value
  selectedSlug.value = slug
  ud.setActivePath(slug)
}
function onBudgetChange(e: Event) {
  ud.setWeeklyMinutes(Number((e.target as HTMLSelectElement).value))
}

const stateSymbol = (id: string) => {
  const s = lessonState(id, ud.progress)
  return s === 'done' ? '✓' : s === 'learning' ? '◐' : '○'
}
const hours = (minutes: number) => `${Math.round((minutes / 60) * 10) / 10} 小时`
</script>

<template>
  <div class="container-text pt-8">
    <PageHeader
      title="本周计划"
      subtitle="按路线顺序与每周可用时间推导——学完自动补充下一篇，不用想「今天学什么」。"
      :blocks="
        plan
          ? [
            { label: '每周预算', value: hours(budget) },
            { label: '本周清单', value: `${plan.items.length} 篇` },
            { label: '预计用时', value: hours(plan.plannedMinutes) },
            { label: '路线进度', value: `${plan.pathDone} / ${plan.pathTotal}` },
          ]
          : []
      "
    />

    <!-- 控制行：换路线 / 调预算（客户端可调，写入本地档案） -->
    <div v-if="mounted" class="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-2">
      <label class="flex items-center gap-2">
        路线
        <select
          :value="activeSlug"
          class="rounded-card border border-line-strong bg-surface px-2 py-1.5 text-[13px] text-ink"
          aria-label="选择计划来源路线"
          @change="onPathChange"
        >
          <option v-for="p in paths" :key="p.slug" :value="p.slug">{{ p.name }}</option>
        </select>
      </label>
      <label class="flex items-center gap-2">
        每周预算
        <select
          :value="budget"
          class="rounded-card border border-line-strong bg-surface px-2 py-1.5 text-[13px] text-ink"
          aria-label="每周学习预算"
          @change="onBudgetChange"
        >
          <option v-for="m in BUDGET_OPTIONS" :key="m" :value="m">{{ formatMinutes(m) }}</option>
        </select>
      </label>
    </div>
    <p v-else class="meta-mono mt-4">计划在页面加载后从本机进度推导…</p>

    <!-- 本周清单 -->
    <section v-if="plan && plan.items.length" class="mt-6" aria-label="本周计划清单">
      <div class="space-y-2">
        <RouterLink
          v-for="(it, i) in plan.items"
          :key="it.lessonId"
          :to="{ name: 'lesson', params: { courseSlug: it.lesson.courseSlug, lessonSlug: it.lesson.slug } }"
          class="card-plate card-hover flex items-center gap-3 px-4 py-3"
        >
          <span class="meta-mono w-6 shrink-0">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="w-3 shrink-0 text-center" aria-hidden="true">{{ stateSymbol(it.lessonId) }}</span>
          <b class="min-w-0 flex-1 truncate text-card text-ink">{{ it.lesson.title }}</b>
          <span class="meta-mono shrink-0">L{{ it.lesson.difficulty }} · est {{ it.lesson.estMinutes }}min</span>
        </RouterLink>
      </div>
      <p class="meta-mono mt-4">
        来源路线：{{ path?.name }} · 学完即达成本周目标，清单会自动补充后续知识点。
      </p>
    </section>

    <EmptyState
      v-else-if="plan"
      class="mt-6"
      emoji="🎉"
      title="这条路线已经全部完成"
      desc="换一条路线继续，或回首页看看其他领域。"
    >
      <RouterLink to="/explore" class="btn btn-primary btn-sm">浏览全部领域</RouterLink>
    </EmptyState>

    <EmptyState v-else-if="mounted" class="mt-6" emoji="🧭" title="还没有可用的路线" desc="先做一次找方向，或直接选一条路线开始。">
      <RouterLink to="/guide" class="btn btn-primary btn-sm">3 分钟找方向</RouterLink>
      <RouterLink to="/explore" class="btn btn-ghost btn-sm">浏览全部领域</RouterLink>
    </EmptyState>

    <div class="h-6"></div>
  </div>
</template>
