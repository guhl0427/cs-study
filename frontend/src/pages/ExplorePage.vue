<script setup lang="ts">
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import DomainCard from '@/components/home/DomainCard.vue'
import QuickStartEntry from '@/components/home/QuickStartEntry.vue'
import { contentApi } from '@/api'
import { usePageTitle } from '@/composables/usePageTitle'

usePageTitle('全部领域')

const domains = contentApi.listDomains()
const site = contentApi.getSite()
const subtitle = `${domains.length} 个方向，每个都是一张学习地图。先看看三种典型起点，再进入具体领域。`
</script>

<template>
  <div class="container-wide pt-8">
    <PageHeader title="全部领域" :subtitle="subtitle" />

    <!-- 典型学习起点（需求 §3.2）：图类容器 -->
    <section class="grid-zone rounded-card border border-line-strong p-5">
      <div class="grid gap-3 md:grid-cols-3">
        <QuickStartEntry v-for="qs in site.quickStarts" :key="qs.id" :entry="qs" />
      </div>
    </section>

    <!-- 领域全列：含「建议先修」（F1 / §3.2） -->
    <section class="mt-10">
      <h2 class="text-section font-bold text-ink">领域列表</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="d in domains" :key="d.id" class="flex flex-col gap-2">
          <DomainCard :domain="d" class="flex-1" />
          <p class="meta-mono px-1">建议先修：{{ d.prereqNote || '无' }}</p>
        </div>
      </div>
    </section>

    <p class="mt-10 text-caption text-ink-2">
      找不到方向？<RouterLink to="/guide" class="text-accent underline underline-offset-2">去「找方向」问答</RouterLink>，3 道题为你推荐路线。
    </p>
    <div class="h-6"></div>
  </div>
</template>
