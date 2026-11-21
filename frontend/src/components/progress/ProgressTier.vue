<script setup lang="ts">
import { computed } from 'vue'

/** 多级进度条（F4.2）：章节/课程实色填充，领域档用剖面线填充区分层级 */
const props = withDefaults(
  defineProps<{
    percent: number
    variant?: 'solid' | 'hatch'
    label?: string
  }>(),
  { variant: 'solid' },
)

const fill = computed(() =>
  props.variant === 'hatch'
    ? 'repeating-linear-gradient(-45deg, var(--color-accent) 0 5px, var(--color-teal) 5px 7px)'
    : 'var(--color-accent)',
)
</script>

<template>
  <div
    class="h-2 overflow-hidden rounded-node border border-line bg-surface"
    role="progressbar"
    :aria-valuenow="Math.round(percent)"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label ?? '进度'"
  >
    <div class="h-full transition-[width]" :style="{ width: `${Math.min(100, Math.max(0, percent))}%`, background: fill }"></div>
  </div>
</template>
