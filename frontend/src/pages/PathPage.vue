<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import RoadmapView from '@/components/roadmap/RoadmapView.vue'
import { contentApi } from '@/api'
import { useUserDataStore } from '@/stores/userData'
import { useUiStore } from '@/stores/ui'
import { useClientMounted } from '@/composables/useClientMounted'
import { usePageTitle } from '@/composables/usePageTitle'
import { lessonState } from '@/lib/progress'

const route = useRoute()
const router = useRouter()
const slug = String(route.params.slug)
const path = contentApi.getPath(slug)

usePageTitle(path?.name ?? '学习路线图')

const ud = useUserDataStore()
const ui = useUiStore()
const mounted = useClientMounted()

const layout = ref<'v' | 'h'>('v')

/** 行动条目标：首个「学习中」节点 → 首个未完成节点（F2 进入定位） */
const continueNode = computed(() => {
  if (!path || !mounted.value) return null
  const items = path.stages.flatMap((s) => s.items)
  const learning = items.find((it) => it.lesson && lessonState(it.lessonId, ud.progress) === 'learning')
  const next = items.find((it) => it.lesson && lessonState(it.lessonId, ud.progress) === 'todo')
  return (learning ?? next ?? null)
})

function start() {
  if (!path) return
  ud.setActivePath(path.slug)
  if (!continueNode.value?.lesson) {
    ui.toast('info', '这条路线还没有可学的知识点')
    return
  }
  router.push({
    name: 'lesson',
    params: { courseSlug: continueNode.value.lesson.courseSlug, lessonSlug: continueNode.value.lesson.slug },
  })
}
</script>

<template>
  <div class="container-wide pt-8">
    <template v-if="path">
      <PageHeader
        :title="path.name"
        :subtitle="path.description"
        :blocks="[
          { label: '图别', value: '学习路线图' },
          { label: '阶段', value: `${path.stages.length} 个` },
          { label: '知识点节点', value: `${path.nodeCount} 个` },
          { label: '适合人群', value: path.targetAudience || '初学者' },
        ]"
      >
        <template #actions>
          <!-- 布局切换（横向泳道仅桌面可用） -->
          <div class="hidden items-center gap-0.5 rounded-card border border-line bg-surface p-0.5 lg:flex" role="group" aria-label="路线图布局">
            <button
              class="rounded-node px-3 py-1 text-[12px] font-medium"
              :class="layout === 'v' ? 'bg-accent-subtle text-accent' : 'text-ink-2'"
              type="button"
              @click="layout = 'v'"
            >
              纵向
            </button>
            <button
              class="rounded-node px-3 py-1 text-[12px] font-medium"
              :class="layout === 'h' ? 'bg-accent-subtle text-accent' : 'text-ink-2'"
              type="button"
              @click="layout = 'h'"
            >
              横向
            </button>
          </div>
        </template>
      </PageHeader>

      <!-- 图例（F2 依赖语义） -->
      <p class="meta-mono mb-4 flex flex-wrap gap-x-4 gap-y-1">
        <span>实线 → 顺序推进</span>
        <span>虚线 → 分支二选一</span>
        <span>✓ → 已完成</span>
        <span>◐ → 学习中</span>
        <span>○ → 未开始</span>
      </p>

      <!-- 路线图本体 · 图类容器 -->
      <section class="grid-zone rounded-card border border-line-strong p-5 sm:p-7">
        <RoadmapView :path="path" :layout="layout" />
      </section>

      <!-- 底部行动条 -->
      <div class="card-plate mt-6 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p class="text-body-ui text-ink-2">
          <template v-if="continueNode?.lesson">
            继续：<b class="text-ink">{{ continueNode.lesson.title }}</b>
          </template>
          <template v-else>从这条路线的起点开始。</template>
        </p>
        <button class="btn btn-primary" type="button" @click="start">
          {{ continueNode?.lesson ? `继续：${continueNode.lesson.title}` : '从起点开始' }}
        </button>
      </div>
    </template>

    <EmptyState v-else emoji="🗺️" title="路线不存在" desc="检查一下地址，或回到全部领域列表。">
      <RouterLink to="/explore" class="btn btn-primary btn-sm">浏览全部领域</RouterLink>
    </EmptyState>

    <div class="h-6"></div>
  </div>
</template>
