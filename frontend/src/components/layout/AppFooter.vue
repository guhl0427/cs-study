<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { openFeedback } from '@/lib/feedback'

const version = `v${__APP_VERSION__}`
</script>

<template>
  <footer class="mt-14 border-t border-line bg-surface-muted">
    <div class="container-wide flex flex-col gap-2 py-6 text-caption text-ink-2 sm:flex-row sm:items-center sm:justify-between">
      <nav class="flex flex-wrap gap-x-5 gap-y-1" aria-label="页脚导航">
        <RouterLink to="/explore" class="hover:text-ink">全部领域</RouterLink>
        <RouterLink to="/guide" class="hover:text-ink">找方向</RouterLink>
        <button type="button" class="hover:text-ink" @click="openFeedback('/')">内容纠错 / 建议</button>
      </nav>
      <p>
        本站不收集任何数据 · 学习记录仅存于本设备
        <span class="meta-mono ml-2">{{ version }} · 纯前端版</span>
      </p>
    </div>
  </footer>
</template>
