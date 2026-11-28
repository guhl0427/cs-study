<script setup lang="ts">
import { watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { IconFlag } from '@tabler/icons-vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LessonArticle from '@/components/lesson/LessonArticle.vue'
import LessonNotesPanel from '@/components/lesson/LessonNotesPanel.vue'
import TocPanel from '@/components/lesson/TocPanel.vue'
import PrevNextNav from '@/components/lesson/PrevNextNav.vue'
import ResourceList from '@/components/lesson/ResourceList.vue'
import MarkDoneButton from '@/components/progress/MarkDoneButton.vue'
import { contentApi } from '@/api'
import { useUserDataStore } from '@/stores/userData'
import { usePageTitle, SITE_URL } from '@/composables/usePageTitle'
import { useStudyTimer } from '@/composables/useStudyTimer'
import { openFeedback } from '@/lib/feedback'
import { lessonState } from '@/lib/progress'
import { formatDate } from '@/lib/format'

const route = useRoute()
const courseSlug = String(route.params.courseSlug)
const lessonSlug = String(route.params.lessonSlug)
const view = contentApi.getLesson(courseSlug, lessonSlug)
const course = contentApi.getCourse(courseSlug)

usePageTitle(
  view?.meta.title ?? '知识点',
  view ? `${view.meta.summary} · ${view.meta.courseTitle} · 约 ${view.meta.estMinutes} 分钟` : undefined,
  view
    ? {
        '@context': 'https://schema.org',
        '@type': 'LearningResource',
        name: view.meta.title,
        description: view.meta.summary,
        inLanguage: 'zh-CN',
        learningResourceType: 'Lesson',
        url: `${SITE_URL}/course/${view.meta.courseSlug}/lesson/${view.meta.slug}`,
        isPartOf: { '@type': 'Course', name: view.meta.courseTitle ?? '' },
      }
    : undefined,
)

const ud = useUserDataStore()

// 进入即「学习中」+ 记录最近学习（F4.3）。
// 必须等 store 装载完成后再标记：子组件 onMounted 先于父组件（App 的 init）执行，
// 抢跑会用 learning 覆盖已有的 done 记录——因此 watch loaded 而不是直接 onMounted。
watch(
  () => ud.loaded,
  (loaded) => {
    if (loaded && view) ud.ensureLearning(view.meta)
  },
  { immediate: true },
)

const pagePath = `/course/${courseSlug}/lesson/${lessonSlug}`

// 真实学习时长计时（30s 粒度、仅页面可见时累计；store 装载完成后启用）
useStudyTimer(view?.meta.id ?? '', () => ud.loaded && Boolean(view))

const stateOf = (id: string) =>
  lessonState(id, ud.progress) === 'done' ? '✓' : lessonState(id, ud.progress) === 'learning' ? '◐' : '○'

const isCurrentLesson = (id?: string) => id === view?.meta.id
</script>

<template>
  <div v-if="view" class="container-wide pt-6">
    <!-- 面包屑 -->
    <nav class="meta-mono mb-4" aria-label="面包屑">
      <RouterLink :to="`/domain/${view.meta.domainSlug}`" class="hover:text-ink">{{ view.meta.domainName }}</RouterLink>
      <span> / </span>
      <RouterLink :to="`/course/${courseSlug}`" class="hover:text-ink">{{ view.meta.courseTitle }}</RouterLink>
      <span> / </span>
      <span class="text-ink">{{ view.meta.chapterTitle }}</span>
    </nav>

    <div class="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)_210px]">
      <!-- ① 课程目录（左粘性栏；移动端折叠） -->
      <aside class="hidden lg:block">
        <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <p class="meta-mono mb-3 font-bold">{{ course?.title }}</p>
          <div v-for="ch in course?.chapters" :key="ch.id" class="mb-4">
            <p class="text-[13px] font-bold text-ink">{{ ch.title }}</p>
            <ul class="mt-1.5 list-none space-y-1 p-0">
              <li v-for="l in ch.lessons" :key="l.id">
                <RouterLink
                  :to="{ name: 'lesson', params: { courseSlug, lessonSlug: l.slug } }"
                  class="flex items-center gap-1.5 text-[13px]"
                  :class="isCurrentLesson(l.id) ? 'font-bold text-accent' : 'text-ink-2 hover:text-ink'"
                >
                  <span class="w-3 text-center" aria-hidden="true">{{ stateOf(l.id) }}</span>
                  <span class="truncate">{{ l.title }}</span>
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <!-- ② 正文列 -->
      <article class="min-w-0">
        <!-- 移动端：课程目录折叠块 -->
        <details class="mb-6 border border-dashed border-line-strong bg-surface px-4 py-2 rounded-card lg:hidden">
          <summary class="cursor-pointer text-[13px] font-bold text-ink">本课程目录</summary>
          <div class="mt-3">
            <div v-for="ch in course?.chapters" :key="ch.id" class="mb-3">
              <p class="text-[13px] font-bold text-ink">{{ ch.title }}</p>
              <ul class="mt-1 list-none space-y-1 p-0">
                <li v-for="l in ch.lessons" :key="l.id">
                  <RouterLink
                    :to="{ name: 'lesson', params: { courseSlug, lessonSlug: l.slug } }"
                    class="text-[13px]"
                    :class="isCurrentLesson(l.id) ? 'font-bold text-accent' : 'text-ink-2'"
                  >
                    {{ l.title }}
                  </RouterLink>
                </li>
              </ul>
            </div>
          </div>
        </details>

        <h1 class="text-title-page font-extrabold text-ink">{{ view.meta.title }}</h1>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <span class="rounded-node border border-line-strong px-2 py-1 font-mono text-[12px] text-ink-2">
            L{{ view.meta.difficulty }} · est {{ view.meta.estMinutes }}min
          </span>
          <span class="meta-mono">{{ view.meta.index }} / {{ view.meta.total }}</span>
          <span
            v-for="t in view.meta.tags"
            :key="t"
            class="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-2"
          >
            {{ t }}
          </span>
        </div>

        <LessonArticle :html="view.html" class="mt-6" />

        <!-- 本地笔记（移动端折叠；桌面在右栏） -->
        <details class="mt-6 lg:hidden">
          <summary class="cursor-pointer text-[13px] font-bold text-ink">我的笔记</summary>
          <LessonNotesPanel :lesson-id="view.meta.id" class="mt-3" />
        </details>

        <!-- 精选外链（F3.4，frontmatter 驱动） -->
        <section class="mt-8">
          <h2 class="text-section font-bold text-ink">精选外链</h2>
          <p class="meta-mono mt-1 mb-3">经筛选的延伸资源 · 标注类型与难度 · 新窗口打开</p>
          <ResourceList :resources="view.meta.resources" />
          <p v-if="!view.meta.resources.length" class="text-caption text-ink-2">
            本知识点外链资源筹备中——<button class="text-accent underline underline-offset-2" type="button" @click="openFeedback(pagePath)">推荐一条资源</button>
          </p>
        </section>

        <p class="meta-mono mt-8" v-if="view.meta.updated">最后更新 {{ formatDate(view.meta.updated) }}</p>

        <!-- 底部动作条：标记完成 + 上下篇（移动端 sticky） -->
        <div class="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-line bg-surface px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
          <div class="flex items-center gap-4">
            <MarkDoneButton :lesson="view.meta" />
            <button class="btn btn-ghost btn-sm ml-auto" type="button" @click="openFeedback(pagePath)">
              <IconFlag size="14" stroke-width="1.5" />
              报错 / 建议
            </button>
          </div>
        </div>
        <PrevNextNav :prev="view.meta.prev" :next="view.meta.next" class="mt-6" />

        <!-- 仅存本设备常驻提示（原则 5） -->
        <p class="mt-8 text-caption text-ink-2">
          进度仅保存在本设备 · <RouterLink to="/settings" class="text-accent underline underline-offset-2">导出备份</RouterLink>
        </p>
      </article>

      <!-- ③ 右辅助列：目录 + 本地笔记（整列粘性，超高可滚动） -->
      <aside class="hidden lg:block">
        <div class="sticky top-20 max-h-[calc(100vh-6rem)] space-y-4 overflow-y-auto pr-1">
          <TocPanel :toc="view.toc" />
          <LessonNotesPanel :lesson-id="view.meta.id" />
        </div>
      </aside>
    </div>
  </div>

  <div v-else class="container-text pt-16">
    <EmptyState emoji="📄" title="知识点不存在" desc="内容可能已调整，回到课程目录看看。">
      <RouterLink :to="`/course/${courseSlug}`" class="btn btn-primary btn-sm">返回课程</RouterLink>
    </EmptyState>
  </div>
</template>
