<script setup lang="ts">
import { computed } from 'vue'
import type { ProgressState } from '@/lib/progress'

/** 进度状态徽标（tokens §1.7 全站唯一词表与配色） */
const props = defineProps<{ state: ProgressState }>()

const cfg = computed(() => {
  switch (props.state) {
    case 'done':
      return { label: '已完成', cls: 'border-ok bg-ok text-on-ok' }
    case 'learning':
      return { label: '学习中', cls: 'border-teal bg-surface text-teal' }
    default:
      return { label: '未开始', cls: 'border-dashed border-line bg-surface text-ink-2' }
  }
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-node border px-2 py-0.5 text-[12px] font-medium leading-none"
    :class="cfg.cls"
    >{{ cfg.label }}</span
  >
</template>
