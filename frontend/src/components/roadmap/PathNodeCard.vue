<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { PathItem } from '@/types/content'
import type { ProgressState } from '@/lib/progress'

/** 路线图节点（F2.3/2.4）：状态三态 + 当前焦点环 + 前置未满足提示（F2.2） */
defineProps<{
  item: PathItem
  state: ProgressState
  isCurrent?: boolean
  prereqTitle: string | null
}>()

const symbol: Record<ProgressState, string> = {
  todo: '○',
  learning: '◐',
  done: '✓',
}

const stateCls: Record<ProgressState, string> = {
  todo: 'border-dashed border-line text-ink-2',
  learning: 'border-teal text-ink',
  done: 'border-ok bg-ok-subtle text-ink',
}

</script>

<template>
  <div class="flex flex-col gap-1">
    <RouterLink
      v-if="item.lesson"
      :to="{ name: 'lesson', params: { courseSlug: item.lesson.courseSlug, lessonSlug: item.lesson.slug } }"
      class="card-plate card-hover flex items-center gap-2.5 px-3 py-2.5"
      :class="[stateCls[state], isCurrent ? 'ring-2 ring-accent ring-offset-2 ring-offset-page' : '']"
    >
      <span class="w-4 text-center font-bold" :class="state === 'done' ? 'text-ok' : state === 'learning' ? 'text-teal' : 'text-ink-2'" aria-hidden="true">
        {{ symbol[state] }}
      </span>
      <span class="min-w-0 flex-1 truncate text-[14px] font-semibold">{{ item.lesson.title }}</span>
      <span class="meta-mono shrink-0">L{{ item.lesson.difficulty }} · est {{ item.lesson.estMinutes }}min</span>
    </RouterLink>

    <p v-if="prereqTitle" class="ml-1 text-[12px] text-warn">建议先完成：{{ prereqTitle }}</p>
  </div>
</template>
