<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { contentApi } from '@/api'
import { search, highlight, type SearchDoc } from '@/lib/search'
import { usePageTitle } from '@/composables/usePageTitle'

usePageTitle('搜索')

const route = useRoute()
const router = useRouter()
const domains = contentApi.listDomains()

/* ---- 查询状态：URL ?q= 为单一来源，输入 300ms 防抖回写 ---- */
const q = ref(String(route.query.q ?? ''))
const inputEl = ref<HTMLInputElement | null>(null)

onMounted(() => inputEl.value?.focus())

let timer: number | undefined
watch(q, (v) => {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    if (v !== String(route.query.q ?? '')) {
      router.replace({ query: { ...route.query, q: v || undefined } })
    }
  }, 300)
})

// 浏览器前进/后退 → 同步输入框
watch(
  () => route.query.q,
  (v) => {
    const s = String(v ?? '')
    if (s !== q.value) q.value = s
  },
)

/* ---- 过滤（F6.2）：领域 × 难度组合 ---- */
const domainFilter = ref<string>('all')
const levelFilter = ref<number | 'all'>('all')

/* ---- 检索：内存索引（构建期文档），无网络请求 ---- */
const results = ref<Array<SearchDoc & { score: number }>>([])
const tookMs = ref(0)
const showAll = ref(false)

watch(
  [q, domainFilter, levelFilter],
  () => {
    const t0 = performance.now()
    const all = search(q.value)
    tookMs.value = Math.round(performance.now() - t0)
    results.value = all
      .filter((d) => domainFilter.value === 'all' || d.domainSlug === domainFilter.value)
      .filter((d) => levelFilter.value === 'all' || d.difficulty === levelFilter.value)
    showAll.value = false
  },
  { immediate: true },
)

const LIMIT = 50
const visible = computed(() => (showAll.value ? results.value : results.value.slice(0, LIMIT)))

const metaLabel = (d: SearchDoc) =>
  d.difficulty === null ? '' : `L${d.difficulty}${d.estMinutes ? ` · est ${d.estMinutes}min` : ''}`
</script>

<template>
  <div class="container-text pt-8">
    <PageHeader title="搜索" subtitle="按标题与摘要检索领域、课程与知识点。构建期索引，本地毫秒级返回。" />

    <!-- ① 大号搜索框（自动聚焦） -->
    <div class="relative">
      <input
        ref="inputEl"
        v-model="q"
        type="search"
        placeholder="搜索课程 / 知识点…"
        aria-label="搜索课程与知识点"
        class="w-full rounded-full border border-line-strong bg-surface px-5 py-3 text-body-ui text-ink placeholder:text-ink-3 focus:border-accent"
      />
    </div>

    <!-- ② 过滤行 -->
    <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div class="flex items-center gap-1 rounded-card border border-line bg-surface p-0.5" role="group" aria-label="按领域过滤">
        <button
          class="rounded-node px-3 py-1 text-[12px] font-medium"
          :class="domainFilter === 'all' ? 'bg-accent-subtle text-accent' : 'text-ink-2'"
          type="button"
          @click="domainFilter = 'all'"
        >
          全部领域
        </button>
        <button
          v-for="d in domains"
          :key="d.slug"
          class="rounded-node px-3 py-1 text-[12px] font-medium"
          :class="domainFilter === d.slug ? 'bg-accent-subtle text-accent' : 'text-ink-2'"
          type="button"
          @click="domainFilter = d.slug"
        >
          {{ d.name }}
        </button>
      </div>
      <div class="flex items-center gap-1 rounded-card border border-line bg-surface p-0.5" role="group" aria-label="按难度过滤">
        <button
          v-for="opt in ['all', 1, 2, 3, 4] as const"
          :key="String(opt)"
          class="rounded-node px-3 py-1 text-[12px] font-medium"
          :class="levelFilter === opt ? 'bg-accent-subtle text-accent' : 'text-ink-2'"
          type="button"
          @click="levelFilter = opt"
        >
          {{ opt === 'all' ? '全部难度' : `L${opt}` }}
        </button>
      </div>
    </div>

    <!-- ③ 结果列表 -->
    <section v-if="results.length" class="mt-6" aria-label="搜索结果">
      <p class="meta-mono mb-3">
        共 {{ results.length }} 条 · 耗时 {{ tookMs }} ms · 搜索范围：标题与摘要
      </p>
      <div class="space-y-2.5">
        <RouterLink
          v-for="d in visible"
          :key="d.id"
          :to="d.url"
          class="card-plate card-hover block px-4 py-3"
        >
          <span class="flex flex-wrap items-center gap-2">
            <span class="rounded-node border border-line-strong px-1.5 py-0.5 font-mono text-[11px] text-ink-2">
              {{ d.type }}
            </span>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <b class="text-card font-bold text-ink" v-html="highlight(d.title, q)"></b>
            <span v-if="metaLabel(d)" class="meta-mono">{{ metaLabel(d) }}</span>
          </span>
          <span class="meta-mono mt-1 block">{{ d.crumb }}</span>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="mt-1 block text-[13px] leading-relaxed text-ink-2" v-html="highlight(d.summary, q)"></span>
        </RouterLink>
      </div>
      <button v-if="results.length > LIMIT && !showAll" class="btn btn-ghost btn-sm mt-4" type="button" @click="showAll = true">
        显示更多（还有 {{ results.length - LIMIT }} 条）
      </button>
    </section>

    <!-- 空结果 -->
    <EmptyState
      v-else-if="q.trim()"
      class="mt-6"
      emoji="🔍"
      :title="`没有找到与「${q.trim()}」相关的内容`"
      desc="换个关键词试试；或先去找方向、浏览全部领域。"
    >
      <RouterLink to="/guide" class="btn btn-ghost btn-sm">去找方向</RouterLink>
      <RouterLink to="/explore" class="btn btn-ghost btn-sm">浏览全部领域</RouterLink>
    </EmptyState>

    <div class="h-8"></div>
  </div>
</template>
