<script setup lang="ts">
import { IconFlame } from '@tabler/icons-vue'

/** 连续学习天数（F4.4）：≥3 天才展示；7 的倍数给里程碑高亮（components.md） */
defineProps<{ streak: number }>()
</script>

<template>
  <span
    v-if="streak >= 3"
    class="inline-flex items-center gap-1 rounded-node border px-2 py-1 text-[12px] font-medium leading-none"
    :class="streak % 7 === 0 ? 'border-warn bg-warn-subtle text-warn' : 'border-line-strong bg-surface text-ink-2'"
    :aria-label="`连续学习 ${streak} 天`"
  >
    <IconFlame size="13" stroke-width="1.5" />
    连续 {{ streak }} 天
  </span>
</template>
