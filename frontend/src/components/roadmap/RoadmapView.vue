<script setup lang="ts">
import { computed } from 'vue'
import PathNodeCard from './PathNodeCard.vue'
import { useUserDataStore } from '@/stores/userData'
import { useClientMounted } from '@/composables/useClientMounted'
import { lessonState } from '@/lib/progress'
import type { LearningPath, PathItem, PathStage } from '@/types/content'
import type { ProgressState } from '@/lib/progress'

/**
 * 路线图渲染（F2）：纵向时间轴（默认）与横向泳道（lg 可选切换）。
 * 状态来源 = 本地 progress（SSR 与水合首帧一致为空，mount 后响应式点亮）。
 * 连线语义：左轨道实线 = 顺序推进；分支组虚线 = 并列选项（F2.5）。
 */
const props = defineProps<{
  path: LearningPath
  layout: 'v' | 'h'
}>()

const ud = useUserDataStore()
const mounted = useClientMounted()

/** 路径内所有节点索引（前置判断用） */
const itemById = computed(() => {
  const map = new Map<string, PathItem>()
  for (const s of props.path.stages) for (const it of s.items) map.set(it.id, it)
  return map
})

const itemState = (item: PathItem): ProgressState =>
  mounted.value && item.lesson ? lessonState(item.lessonId, ud.progress) : 'todo'

const currentItemId = computed(() => {
  if (!mounted.value) return null
  for (const s of props.path.stages) {
    for (const it of s.items) {
      if (it.lesson && lessonState(it.lessonId, ud.progress) === 'learning') return it.id
    }
  }
  for (const s of props.path.stages) {
    for (const it of s.items) {
      if (it.lesson && lessonState(it.lessonId, ud.progress) === 'todo') return it.id
    }
  }
  return null
})

/** 前置未满足 → 提示文案（F2.2：只提示不阻断） */
const prereqTitleOf = (item: PathItem): string | null => {
  if (!mounted.value) return null
  for (const pre of item.prereqs) {
    const preItem = itemById.value.get(pre)
    if (preItem?.lesson && lessonState(preItem.lessonId, ud.progress) !== 'done') {
      return preItem.lesson.title
    }
  }
  return null
}

interface RenderNode {
  kind: 'item' | 'branch'
  items: PathItem[]
}

/** 同阶段内连续同 branch 的节点归为分支组 */
function groupItems(items: PathItem[]): RenderNode[] {
  const out: RenderNode[] = []
  for (const it of items) {
    const last = out[out.length - 1]
    if (it.branch && last?.kind === 'branch' && last.items[0]?.branch === it.branch) {
      last.items.push(it)
    } else if (it.branch) {
      out.push({ kind: 'branch', items: [it] })
    } else {
      out.push({ kind: 'item', items: [it] })
    }
  }
  return out
}

const stageGroups = (stage: PathStage) => groupItems(stage.items)
</script>

<template>
  <!-- 纵向：左侧实线轨道 -->
  <div v-if="layout === 'v'" class="space-y-10">
    <section v-for="stage in path.stages" :key="stage.id">
      <header class="mb-4">
        <h2 class="text-section font-bold text-ink">
          <span class="meta-mono mr-2 font-bold text-accent">S{{ stage.index }}</span>
          {{ stage.name }}
        </h2>
        <p class="meta-mono mt-1">建议 {{ stage.suggestDuration }}<template v-if="stage.description"> · {{ stage.description }}</template></p>
      </header>

      <div class="ml-3 space-y-3 border-l-2 border-line-strong pl-6">
        <div v-for="(group, gi) in stageGroups(stage)" :key="gi">
          <!-- 分支组：虚线引线 + 二选一标签（F2.5） -->
          <div v-if="group.kind === 'branch'" class="rounded-card border-l-2 border-dashed border-line-strong py-1 pl-4">
            <p class="meta-mono mb-2">二选一深入 · 任选其一</p>
            <div class="space-y-2.5">
              <PathNodeCard
                v-for="it in group.items"
                :key="it.id"
                :item="it"
                :state="itemState(it)"
                :is-current="currentItemId === it.id"
                :prereq-title="prereqTitleOf(it)"
              />
            </div>
          </div>
          <PathNodeCard
            v-else
            :item="group.items[0]"
            :state="itemState(group.items[0])"
            :is-current="currentItemId === group.items[0].id"
            :prereq-title="prereqTitleOf(group.items[0])"
          />
        </div>
      </div>
    </section>
  </div>

  <!-- 横向：阶段泳道（lg 断点建议使用，容器可横向滚动） -->
  <div v-else class="scroll-x flex gap-4 overflow-x-auto pb-2">
    <template v-for="(stage, si) in path.stages" :key="stage.id">
      <section class="w-72 shrink-0">
        <header class="mb-3 border-b border-line pb-2">
          <h2 class="text-card font-bold text-ink">
            <span class="meta-mono mr-2 font-bold text-accent">S{{ stage.index }}</span>
            {{ stage.name }}
          </h2>
          <p class="meta-mono mt-1">建议 {{ stage.suggestDuration }}</p>
        </header>
        <div class="space-y-2.5">
          <div v-for="(group, gi) in stageGroups(stage)" :key="gi">
            <div v-if="group.kind === 'branch'" class="rounded-card border-l-2 border-dashed border-line-strong py-1 pl-3">
              <p class="meta-mono mb-2">二选一深入</p>
              <div class="space-y-2">
                <PathNodeCard
                  v-for="it in group.items"
                  :key="it.id"
                  :item="it"
                  :state="itemState(it)"
                  :is-current="currentItemId === it.id"
                  :prereq-title="prereqTitleOf(it)"
                />
              </div>
            </div>
            <PathNodeCard
              v-else
              :item="group.items[0]"
              :state="itemState(group.items[0])"
              :is-current="currentItemId === group.items[0].id"
              :prereq-title="prereqTitleOf(group.items[0])"
            />
          </div>
        </div>
      </section>
      <div v-if="si < path.stages.length - 1" class="flex items-center text-ink-3" aria-hidden="true">→</div>
    </template>
  </div>
</template>
