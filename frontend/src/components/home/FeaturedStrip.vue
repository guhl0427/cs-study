<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { IconStar } from '@tabler/icons-vue'
import type { Featured } from '@/types/content'

/** 编辑精选推荐位（F1.4）：静态配置，accent 淡底横条 + 左侧色条 */
defineProps<{ item: Featured }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-accent border-l-4 border-l-accent bg-accent-subtle px-4 py-3">
    <span class="flex items-center gap-1.5 text-[13px] font-bold text-accent">
      <IconStar size="15" stroke-width="1.5" />
      编辑精选
    </span>
    <b class="text-body-ui text-ink">{{ item.title }}</b>
    <span class="text-[13px] text-ink-2">{{ item.desc }}</span>
    <RouterLink v-if="item.pathSlug" :to="`/path/${item.pathSlug}`" class="btn btn-text btn-sm ml-auto">
      查看路线
    </RouterLink>
    <RouterLink v-else-if="item.courseSlug" :to="`/course/${item.courseSlug}`" class="btn btn-text btn-sm ml-auto">
      查看课程
    </RouterLink>
  </div>
</template>
