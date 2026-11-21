<script setup lang="ts">
import { RouterLink } from 'vue-router'
import DifficultyBadge from '@/components/ui/DifficultyBadge.vue'
import { formatMinutes } from '@/lib/format'
import type { Course } from '@/types/content'

/** 领域页课程列表卡（components.md DomainCard 课程变体） */
defineProps<{ course: Course }>()
</script>

<template>
  <RouterLink
    :to="`/course/${course.slug}`"
    class="card-plate card-hover block p-4"
    :aria-label="`进入课程：${course.title}`"
  >
    <div class="flex items-start justify-between gap-3">
      <h3 class="text-card font-bold text-ink">{{ course.title }}</h3>
      <DifficultyBadge :level="course.difficulty" />
    </div>
    <p class="mt-1.5 min-h-[2.6em] text-[13px] leading-relaxed text-ink-2">{{ course.summary }}</p>
    <p class="meta-mono mt-3">
      {{ course.lessonCount }} 个知识点 · 约 {{ formatMinutes(course.estMinutesTotal) }}
    </p>
  </RouterLink>
</template>
