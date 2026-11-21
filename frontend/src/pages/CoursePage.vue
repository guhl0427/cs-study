<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ProgressTier from '@/components/progress/ProgressTier.vue'
import FavoriteButton from '@/components/progress/FavoriteButton.vue'
import { contentApi } from '@/api'
import { useUserDataStore } from '@/stores/userData'
import { useClientMounted } from '@/composables/useClientMounted'
import { usePageTitle } from '@/composables/usePageTitle'
import { courseProgress, chapterProgress, findNextIncomplete, lessonState } from '@/lib/progress'
import { formatMinutes } from '@/lib/format'
import type { LessonMeta } from '@/types/content'

const route = useRoute()
const slug = String(route.params.slug)
const course = contentApi.getCourse(slug)

usePageTitle(course?.title ?? '课程')

const ud = useUserDataStore()
const mounted = useClientMounted()

const prog = computed(() => (course ? courseProgress(course, ud.progress) : null))
const nextLesson = computed(() =>
  course && mounted.value ? findNextIncomplete(course, ud.progress) : undefined,
)

const chapterStat = (lessonIds: string[]) => chapterProgress(lessonIds, ud.progress)

const rowSymbol = (l: LessonMeta) =>
  mounted.value ? (lessonState(l.id, ud.progress) === 'done' ? '✓' : lessonState(l.id, ud.progress) === 'learning' ? '◐' : '○') : '○'

const rowCls = (l: LessonMeta) => {
  const s = mounted.value ? lessonState(l.id, ud.progress) : 'todo'
  return s === 'done' ? 'text-ok' : s === 'learning' ? 'text-teal' : 'text-ink-3'
}
</script>

<template>
  <div class="container-text pt-8">
    <template v-if="course">
      <PageHeader :title="course.title" :subtitle="course.summary">
        <template #actions>
          <FavoriteButton target-type="course" :target-id="course.id" :title="course.title" />
        </template>
      </PageHeader>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-ui text-ink-2">
        <span>适合人群：{{ course.audience || '初学者' }}</span>
        <span>·</span>
        <span>前置要求：{{ course.prereqs || '无' }}</span>
      </div>
      <p class="meta-mono mt-2">
        预计 {{ formatMinutes(course.estMinutesTotal) }} · {{ course.chapters.length }} 章 · {{ course.lessonCount }} 个知识点
      </p>

      <!-- 课程进度（有记录才渲染，F3.2） -->
      <section v-if="mounted && prog && prog.done > 0" class="card-plate mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <div class="min-w-[220px] flex-1">
          <ProgressTier :percent="prog.percent" label="课程完成度" />
          <p class="mt-1.5 text-caption text-ink-2">
            已完成 {{ prog.done }} / {{ prog.total }}<span v-if="prog.learning"> · 学习中 {{ prog.learning }}</span>
          </p>
        </div>
        <RouterLink v-if="nextLesson" :to="{ name: 'lesson', params: { courseSlug: course.slug, lessonSlug: nextLesson.slug } }" class="btn btn-primary">
          继续学习：{{ nextLesson.title }}
        </RouterLink>
        <span v-else class="text-body-ui text-ok">✓ 全部完成——可以开始课程自测了（测验模块即将上线）</span>
      </section>

      <!-- 章节目录（F3.2） -->
      <section class="mt-8 space-y-4">
        <h2 class="text-section font-bold text-ink">章节目录</h2>
        <div v-for="(ch, i) in course.chapters" :key="ch.id" class="card-plate overflow-hidden">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-muted px-4 py-3">
            <h3 class="text-card font-bold text-ink">第 {{ i + 1 }} 章 · {{ ch.title }}</h3>
            <span class="meta-mono">
              {{ chapterStat(ch.lessons.map((l) => l.id)).done }}/{{ ch.lessons.length }} 已完成 ·
              约 {{ formatMinutes(ch.lessons.reduce((s, l) => s + l.estMinutes, 0)) }}
            </span>
          </div>
          <ul class="m-0 list-none p-0">
            <li v-for="l in ch.lessons" :key="l.id" class="border-b border-line last:border-b-0">
              <RouterLink
                :to="{ name: 'lesson', params: { courseSlug: course.slug, lessonSlug: l.slug } }"
                class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-inset"
              >
                <span class="w-4 text-center font-bold" :class="rowCls(l)" aria-hidden="true">{{ rowSymbol(l) }}</span>
                <span class="text-body-ui text-ink">{{ l.index }}. {{ l.title }}</span>
                <span class="meta-mono ml-auto">L{{ l.difficulty }} · est {{ l.estMinutes }}min</span>
              </RouterLink>
            </li>
          </ul>
        </div>
      </section>
    </template>

    <EmptyState v-else emoji="📚" title="课程不存在" desc="检查一下地址，或回到领域列表。">
      <RouterLink to="/explore" class="btn btn-primary btn-sm">浏览全部领域</RouterLink>
    </EmptyState>

    <div class="h-6"></div>
  </div>
</template>
