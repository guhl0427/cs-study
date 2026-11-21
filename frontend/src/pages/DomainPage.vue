<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { IconCode } from '@tabler/icons-vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import DomainCard from '@/components/home/CourseCard.vue'
import { contentApi } from '@/api'
import { domainIcons } from '@/lib/icons'
import { usePageTitle } from '@/composables/usePageTitle'

const route = useRoute()
const slug = String(route.params.slug)
const domain = contentApi.getDomain(slug)
const courses = contentApi.listCoursesOfDomain(slug)
const paths = contentApi.listPathsOfDomain(slug)

usePageTitle(domain?.name ?? '领域')

const Icon = domainIcons[domain?.icon ?? ''] ?? IconCode

/* 难度筛选（F6.2 领域内筛选，纯前端过滤） */
const filter = ref<number | 'all'>('all')
const filtered = computed(() =>
  filter.value === 'all' ? courses : courses.filter((c) => c.difficulty === filter.value),
)

const spanLabel = computed(() => {
  const s = domain?.difficultySpan
  return s ? `L${s[0]}–L${s[1]}` : '—'
})
</script>

<template>
  <div class="container-wide pt-8">
    <template v-if="domain">
      <PageHeader
        :title="domain.name"
        :subtitle="domain.summary"
        :blocks="[
          { label: '图别', value: '领域学习地图' },
          { label: '课程', value: `${courses.length} 门` },
          { label: '难度跨度', value: spanLabel },
          { label: '版本 / 日期', value: 'v0.1 · 2026-11' },
        ]"
      >
        <template #actions>
          <span class="flex h-12 w-12 items-center justify-center rounded-card bg-accent-subtle text-accent">
            <Icon size="26" stroke-width="1.5" />
          </span>
        </template>
      </PageHeader>

      <!-- 适用信息行 -->
      <p class="text-body-ui text-ink-2">
        <template v-if="domain.audience">适合人群：{{ domain.audience }} · </template>
        建议先修：{{ domain.prereqNote || '无' }}
      </p>

      <!-- 路线图入口（F3.1） -->
      <section v-if="paths.length" class="grid-zone mt-6 rounded-card border border-line-strong p-5">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="min-w-0">
            <h2 class="text-section font-bold text-ink">学习路线图</h2>
            <p class="mt-1 text-[13px] text-ink-2">该领域按阶段编排的完整路径，依赖关系显式标注。</p>
            <p class="meta-mono mt-2">
              {{ paths.map((p) => p.stages.map((s) => s.name).join(' → ')).join(' ｜ ') }}
            </p>
          </div>
          <RouterLink :to="`/path/${paths[0].slug}`" class="btn btn-primary shrink-0">查看完整路线图 →</RouterLink>
        </div>
      </section>

      <!-- 课程列表 -->
      <section class="mt-10">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-section font-bold text-ink">课程（按难度排序）</h2>
          <div class="flex items-center gap-1 rounded-card border border-line bg-surface p-0.5" role="group" aria-label="按难度筛选">
            <button
              v-for="opt in ['all', 1, 2, 3, 4] as const"
              :key="String(opt)"
              class="rounded-node px-3 py-1 text-[12px] font-medium"
              :class="filter === opt ? 'bg-accent-subtle text-accent' : 'text-ink-2'"
              type="button"
              @click="filter = opt"
            >
              {{ opt === 'all' ? '全部' : `L${opt}` }}
            </button>
          </div>
        </div>

        <div v-if="filtered.length" class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DomainCard v-for="c in filtered" :key="c.id" :course="c" />
        </div>
        <EmptyState
          v-else-if="courses.length === 0"
          class="mt-4"
          emoji="🧭"
          title="本领域课程筹备中"
          desc="路线图入口与领域介绍保持可用；课程将按里程碑逐步填充。"
        >
          <RouterLink v-if="paths.length" :to="`/path/${paths[0].slug}`" class="btn btn-ghost btn-sm">先看路线图</RouterLink>
        </EmptyState>
        <EmptyState v-else class="mt-4" title="该难度暂无课程" desc="切换到「全部」查看本领域所有课程。" />
      </section>

      <!-- 学习建议 -->
      <section v-if="domain.advice" class="mt-10">
        <div class="rounded-card border-l-4 border-warn bg-warn-subtle px-4 py-3 text-body-ui text-warn">
          学习建议：{{ domain.advice }}
        </div>
      </section>
    </template>

    <EmptyState v-else emoji="🧭" title="领域不存在" desc="检查一下地址，或回到全部领域列表。">
      <RouterLink to="/explore" class="btn btn-primary btn-sm">浏览全部领域</RouterLink>
    </EmptyState>

    <div class="h-6"></div>
  </div>
</template>
