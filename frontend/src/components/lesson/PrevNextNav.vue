<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { LessonRef } from '@/types/content'

/** 上一篇 / 下一篇（F3.3）：按课程内顺序，构建期生成前后链 */
defineProps<{
  prev?: LessonRef | null
  next?: LessonRef | null
}>()
</script>

<template>
  <nav class="mt-10 grid gap-3 sm:grid-cols-2" aria-label="上一篇与下一篇">
    <RouterLink
      v-if="prev"
      :to="{ name: 'lesson', params: { courseSlug: prev.courseSlug, lessonSlug: prev.lessonSlug } }"
      class="rounded-card border border-dashed border-line-strong p-3.5 text-left hover:border-accent"
    >
      <span class="meta-mono">← 上一篇</span>
      <span class="mt-1 block text-card font-bold text-ink">{{ prev.title }}</span>
    </RouterLink>
    <span v-else></span>
    <RouterLink
      v-if="next"
      :to="{ name: 'lesson', params: { courseSlug: next.courseSlug, lessonSlug: next.lessonSlug } }"
      class="rounded-card border border-dashed border-line-strong p-3.5 text-right hover:border-accent"
    >
      <span class="meta-mono">下一篇 →</span>
      <span class="mt-1 block text-card font-bold text-ink">{{ next.title }}</span>
    </RouterLink>
  </nav>
</template>
