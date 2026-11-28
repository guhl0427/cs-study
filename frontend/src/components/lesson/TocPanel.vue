<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { TocItem } from '@/types/content'

/** 页内目录（lg 右侧粘性列）：滚动联动高亮当前小节 */
const props = defineProps<{ toc: TocItem[] }>()
const active = ref('')

let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) active.value = entry.target.id
      }
    },
    { rootMargin: '-72px 0px -65% 0px' },
  )
  for (const item of props.toc) {
    const el = document.getElementById(item.id)
    if (el) observer.observe(el)
  }
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <nav v-if="toc.length" class="border-l border-line pl-4" aria-label="本页目录">
    <p class="meta-mono mb-2">本页目录</p>
    <ul class="space-y-1.5">
      <li v-for="item in toc" :key="item.id" :class="item.level === 3 ? 'pl-3' : ''">
        <a
          :href="`#${item.id}`"
          class="block py-1.5 text-[13px] leading-snug transition-colors"
          :class="active === item.id ? 'font-bold text-accent' : 'text-ink-2 hover:text-ink'"
        >
          {{ item.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>
