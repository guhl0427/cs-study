<script setup lang="ts">
/** 页面标题区：唯一 h1 + 副说明 + 动作区；blocks 为「图纸标题栏」四格元数据（原则 1） */
defineProps<{
  title: string
  subtitle?: string
  blocks?: { label: string; value: string }[]
}>()
</script>

<template>
  <header class="mb-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-title-page font-extrabold text-ink">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1.5 max-w-[46em] text-body-ui text-ink-2">{{ subtitle }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <slot name="actions" />
      </div>
    </div>

    <!-- 图纸标题栏：1px 分隔线的四格 mono 元数据，每页至多一处 -->
    <div
      v-if="blocks && blocks.length"
      class="mt-5 grid grid-cols-2 gap-px border border-line-strong bg-line-strong shadow-plate sm:grid-cols-4"
    >
      <div v-for="b in blocks" :key="b.label" class="bg-surface px-3.5 py-2">
        <span class="block text-[11px] text-ink-2">{{ b.label }}</span>
        <b class="mt-0.5 block font-mono text-[13px] font-medium text-ink">{{ b.value }}</b>
      </div>
    </div>
  </header>
</template>
