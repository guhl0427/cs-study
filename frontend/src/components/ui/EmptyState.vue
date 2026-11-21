<script setup lang="ts">
/** 空状态：插画位（emoji 允许）+ 一句话说明 + 行动出口（components.md §8） */
defineProps<{
  emoji?: string
  title: string
  desc?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-2 border border-dashed border-line-strong bg-surface px-6 py-12 text-center rounded-card">
    <span v-if="emoji" class="text-3xl" aria-hidden="true">{{ emoji }}</span>
    <p class="text-card font-bold text-ink">{{ title }}</p>
    <p v-if="desc" class="max-w-[36em] text-caption text-ink-2">{{ desc }}</p>
    <div v-if="$slots.default" class="mt-3 flex items-center gap-3">
      <slot />
    </div>
  </div>
</template>
