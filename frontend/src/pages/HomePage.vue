<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import DomainCard from '@/components/home/DomainCard.vue'
import ContinueCard from '@/components/home/ContinueCard.vue'
import GuideEntryCard from '@/components/home/GuideEntryCard.vue'
import QuickStartEntry from '@/components/home/QuickStartEntry.vue'
import FeaturedStrip from '@/components/home/FeaturedStrip.vue'
import { contentApi } from '@/api'
import { useUserDataStore } from '@/stores/userData'
import { useClientMounted } from '@/composables/useClientMounted'
import { usePageTitle } from '@/composables/usePageTitle'

const domains = contentApi.listDomains()
const site = contentApi.getSite()

/** 领域数量动态取自内容数据——文案不再硬编码「九大」 */
const heroIntro = `${domains.length} 大技术领域、完整学习路线、原创知识点讲解。无需注册——你的所有学习记录只保存在自己的浏览器里。`

usePageTitle('打开就能学，进度随身存', heroIntro)

const ud = useUserDataStore()
const mounted = useClientMounted()
const version = `v${__APP_VERSION__}`

/** 回访形态（F1.5）：由 lastVisit 解析出「上次学到」的课程与知识点 */
const continueView = computed(() => {
  if (!mounted.value || !ud.lastVisit) return null
  const course = contentApi.getCourse(ud.lastVisit.courseSlug)
  if (!course) return null
  const visit = ud.lastVisit
  for (const ch of course.chapters) {
    const lesson = ch.lessons.find((l) => l.id === visit.lessonId)
    if (lesson) return { course, lesson }
  }
  return null
})
</script>

<template>
  <div class="container-wide pt-8">
    <!-- ① Hero · 图类容器（网格加浓） -->
    <section class="grid-zone rounded-card border border-line-strong p-5 sm:p-7">
      <div class="grid items-stretch gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div class="flex flex-col justify-center">
          <h1 class="text-display font-extrabold text-ink">打开就能学，进度随身存</h1>
          <p class="mt-3 max-w-[34em] text-body-ui text-ink-2">
            {{ heroIntro }}
          </p>
          <div class="mt-5 flex flex-wrap gap-3">
            <RouterLink to="/guide" class="btn btn-primary">3 分钟找到方向</RouterLink>
            <RouterLink to="/explore" class="btn btn-ghost">浏览全部领域</RouterLink>
          </div>
        </div>
        <!-- 首屏两种形态：回访 → 继续学习；新访客 → 找方向引导 -->
        <div class="flex items-stretch">
          <template v-if="continueView">
            <ContinueCard :course="continueView.course" :lesson="continueView.lesson" class="w-full" />
          </template>
          <GuideEntryCard v-else class="w-full justify-center" />
        </div>
      </div>

      <!-- 图纸标题栏（原则 1：每页至多一处） -->
      <div class="mt-7 grid grid-cols-2 gap-px border border-line-strong bg-line-strong sm:grid-cols-4">
        <div class="bg-surface px-3.5 py-2">
          <span class="block text-[11px] text-ink-2">项目</span>
          <b class="mt-0.5 block font-mono text-[13px] font-medium text-ink">cs-study 学习平台</b>
        </div>
        <div class="bg-surface px-3.5 py-2">
          <span class="block text-[11px] text-ink-2">图别</span>
          <b class="mt-0.5 block font-mono text-[13px] font-medium text-ink">学习地图 · 总览</b>
        </div>
        <div class="bg-surface px-3.5 py-2">
          <span class="block text-[11px] text-ink-2">领域</span>
          <b class="mt-0.5 block font-mono text-[13px] font-medium text-ink">{{ domains.length }} 个方向</b>
        </div>
        <div class="bg-surface px-3.5 py-2">
          <span class="block text-[11px] text-ink-2">版本</span>
          <b class="mt-0.5 block font-mono text-[13px] font-medium text-ink">{{ version }}</b>
        </div>
      </div>
    </section>

    <!-- ② 领域卡片墙（F1.1） -->
    <section class="mt-12">
      <div class="mb-4 flex items-baseline justify-between">
        <h2 class="text-section font-bold text-ink">{{ domains.length }} 大技术领域</h2>
        <RouterLink to="/explore" class="btn btn-text btn-sm">全部领域 →</RouterLink>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DomainCard v-for="d in domains" :key="d.id" :domain="d" />
      </div>
    </section>

    <!-- ③ 新手快捷入口（F1.3） -->
    <section class="mt-12">
      <h2 class="text-section font-bold text-ink">新手快捷入口</h2>
      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <QuickStartEntry v-for="qs in site.quickStarts" :key="qs.id" :entry="qs" />
      </div>
    </section>

    <!-- ④ 编辑精选（F1.4） -->
    <section v-if="site.featured.length" class="mt-12 space-y-3">
      <FeaturedStrip v-for="f in site.featured" :key="f.id" :item="f" />
    </section>

    <div class="h-6"></div>
  </div>
</template>
