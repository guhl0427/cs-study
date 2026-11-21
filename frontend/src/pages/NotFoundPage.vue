<script setup lang="ts">
import { RouterLink } from 'vue-router'
import EmptyState from '@/components/ui/EmptyState.vue'
import { usePageTitle } from '@/composables/usePageTitle'

usePageTitle('页面不存在')
</script>

<template>
  <div class="container-text pt-16">
    <EmptyState emoji="🗺️" title="页面不存在" desc="这张图纸还没画出来。回首页，或者去领域列表找要学的东西。">
      <RouterLink to="/" class="btn btn-primary btn-sm">回首页</RouterLink>
      <RouterLink to="/explore" class="btn btn-ghost btn-sm">浏览全部领域</RouterLink>
    </EmptyState>
  </div>
</template>
