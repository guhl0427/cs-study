<script setup lang="ts">
import { onMounted, ref } from 'vue'

/**
 * 知识点正文容器：渲染构建期编译好的 HTML（md-body 排版 + Shiki blueprint-draft）。
 * 代码块「复制」按钮由构建期注入，本组件做事件委托——预渲染 HTML 中按钮即存在（F3.5）。
 */
const props = defineProps<{ html: string }>()
const root = ref<HTMLElement | null>(null)

async function onClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const btn = target.closest('.code-copy') as HTMLElement | null
  if (!btn) return
  const code = btn.closest('.code-block')?.querySelector('pre code')?.textContent ?? ''
  try {
    await navigator.clipboard.writeText(code)
    btn.textContent = '已复制 ✓'
  } catch {
    btn.textContent = '复制失败'
  }
  window.setTimeout(() => {
    btn.textContent = '复制'
  }, 1200)
}

onMounted(() => {
  root.value?.addEventListener('click', onClick)
})

// v-html 内容来自构建期自产内容（无用户输入），白名单由 markdown-it html:false 保证
const _html = props.html
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div ref="root" class="md-body" v-html="_html"></div>
</template>
