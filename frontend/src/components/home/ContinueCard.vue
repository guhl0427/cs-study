<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import ProgressTier from '@/components/progress/ProgressTier.vue'
import { courseProgress } from '@/lib/progress'
import { useUserDataStore } from '@/stores/userData'
import { formatMinutes } from '@/lib/format'
import type { Course, LessonMeta } from '@/types/content'

/** 继续学习卡（F1.5 / F4.3）：上次学到 + 课程进度 + 主 CTA + streak */
const props = defineProps<{ course: Course; lesson: LessonMeta }>()

const ud = useUserDataStore()
const prog = computed(() => courseProgress(props.course, ud.progress))
</script>

<template>
  <div class="card-plate flex flex-col gap-2 p-4">
    <span class="text-caption text-ink-2">上次学到</span>
    <span class="text-card font-bold text-ink">{{ lesson.title }}</span>
    <span class="meta-mono">{{ course.title }} · 约 {{ formatMinutes(lesson.estMinutes) }}</span>
    <div class="mt-1">
      <ProgressTier :percent="prog.percent" label="课程完成度" />
      <div class="mt-1.5 flex justify-between text-caption text-ink-2">
        <span>课程完成度</span>
        <span class="meta-mono">{{ prog.percent }}%</span>
      </div>
    </div>
    <div class="mt-1 flex items-center gap-2.5">
      <RouterLink
        :to="{ name: 'lesson', params: { courseSlug: course.slug, lessonSlug: lesson.slug } }"
        class="btn btn-primary btn-sm"
      >
        继续学习
      </RouterLink>
      <span v-if="ud.streakDays >= 3" class="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-2">
        连续 {{ ud.streakDays }} 天
      </span>
    </div>
  </div>
</template>
