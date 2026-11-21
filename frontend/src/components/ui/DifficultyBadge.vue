<script setup lang="ts">
import { computed } from 'vue'
import { DIFFICULTY_NAMES } from '@/types/content'

/**
 * 难度徽标（tokens §1.5 剖面线图例）：L1 空白 → L4 满填。
 * 传 number 为单级；传 [min, max] 为跨度徽标（取高者样式）。
 */
const props = defineProps<{ level: number | [number, number] }>()

const isSpan = computed(() => Array.isArray(props.level))
const maxLv = computed(() =>
  isSpan.value ? Math.max(...(props.level as [number, number])) : (props.level as number),
)

const label = computed(() =>
  isSpan.value
    ? `L${(props.level as [number, number])[0]}–L${(props.level as [number, number])[1]}`
    : `L${maxLv.value} ${DIFFICULTY_NAMES[maxLv.value]}`,
)

const ariaLabel = computed(() =>
  isSpan.value
    ? `难度跨度 L${(props.level as [number, number])[0]} 至 L${(props.level as [number, number])[1]}`
    : `难度 L${maxLv.value} ${DIFFICULTY_NAMES[maxLv.value]}`,
)

const cls = computed(() => {
  switch (maxLv.value) {
    case 4:
      return 'bg-ink text-page'
    case 3:
      return 'bg-surface text-accent-strong'
    case 2:
      return 'bg-surface text-accent'
    default:
      return 'bg-surface text-ink-2'
  }
})

const hatch = computed(() => {
  if (maxLv.value === 2) return 'repeating-linear-gradient(45deg, transparent 0 4px, rgba(27,98,166,.35) 4px 5.5px)'
  if (maxLv.value === 3) return 'repeating-linear-gradient(45deg, transparent 0 3px, rgba(27,98,166,.6) 3px 5px)'
  return ''
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-node border border-line-strong px-2 py-1 font-mono text-[12px] font-medium leading-none"
    :class="cls"
    :style="hatch ? { backgroundImage: hatch } : undefined"
    :aria-label="ariaLabel"
  >
    {{ label }}
  </span>
</template>
