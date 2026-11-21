<script setup lang="ts">
import { IconBook, IconBook2, IconMovie, IconTool, IconFileText } from '@tabler/icons-vue'
import { resourceTypeNames } from '@/lib/icons'
import DifficultyBadge from '@/components/ui/DifficultyBadge.vue'
import type { Resource } from '@/types/content'
import type { Component } from 'vue'

/** 精选外链资源块（F3.4）：类型徽标 + 难度 + 推荐语；统一外链出口 rel=noopener */
const props = defineProps<{ resources: Resource[] }>()

const typeIcons: Record<string, Component> = {
  doc: IconFileText,
  book: IconBook2,
  video: IconMovie,
  tool: IconTool,
}
void props
</script>

<template>
  <section v-if="resources.length" aria-label="精选外链资源">
    <div class="space-y-2.5">
      <a
        v-for="r in resources"
        :key="r.id"
        :href="r.url"
        target="_blank"
        rel="noopener noreferrer"
        class="card-plate card-hover flex items-center gap-3 px-4 py-3"
      >
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-card bg-surface-muted text-ink-2">
          <component :is="typeIcons[r.type] ?? IconBook" size="16" stroke-width="1.5" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2">
            <b class="truncate text-[14px] font-bold text-ink">{{ r.title }}</b>
            <span class="meta-mono shrink-0">{{ resourceTypeNames[r.type] ?? r.type }}</span>
          </span>
          <span v-if="r.note" class="mt-0.5 block truncate text-[13px] text-ink-2">{{ r.note }}</span>
        </span>
        <DifficultyBadge v-if="r.difficulty" :level="r.difficulty" />
      </a>
    </div>
  </section>
</template>
