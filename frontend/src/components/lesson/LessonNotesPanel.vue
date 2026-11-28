<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useUserDataStore } from '@/stores/userData'
import { useClientMounted } from '@/composables/useClientMounted'
import { formatDateTime } from '@/lib/format'

/**
 * 知识点本地笔记（回访留存层）：800ms 防抖自动保存到 localStorage，
 * 随导出/导入迁移；卸载时立即落盘，导航走人不丢最后一次输入。
 */
const props = defineProps<{ lessonId: string }>()

const ud = useUserDataStore()
const mounted = useClientMounted()

const text = ref('')
const savedAt = ref('')
const dirty = ref(false)

watch(
  () => ud.loaded,
  (loaded) => {
    if (!loaded) return
    text.value = ud.notes[props.lessonId]?.content ?? ''
    savedAt.value = ud.notes[props.lessonId]?.updatedAt ?? ''
  },
  { immediate: true },
)

let timer: number | undefined
watch(text, () => {
  if (!mounted.value || !ud.loaded) return
  dirty.value = true
  window.clearTimeout(timer)
  timer = window.setTimeout(flush, 800)
})

function flush() {
  window.clearTimeout(timer)
  ud.saveNote(props.lessonId, text.value)
  dirty.value = false
  savedAt.value = new Date().toISOString()
}

onBeforeUnmount(() => {
  if (dirty.value) flush()
})

const charCount = computed(() => text.value.length)
const statusLabel = computed(() => {
  if (dirty.value) return '保存中…'
  if (savedAt.value) return `已保存 ${formatDateTime(savedAt.value).slice(11)}`
  return '尚未记录'
})
</script>

<template>
  <div class="card-plate p-4">
    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="meta-mono">我的笔记 · 仅存本机</p>
      <span v-if="mounted" class="meta-mono shrink-0 text-[11px] text-ink-2">{{ statusLabel }}</span>
    </div>
    <textarea
      v-if="mounted"
      v-model="text"
      rows="6"
      placeholder="用自己的话复述要点、记下踩过的坑——复习时最有用。"
      class="w-full rounded-card border border-line-strong bg-inset px-3 py-2 text-[13px] leading-relaxed text-ink"
      aria-label="本知识点笔记（自动保存）"
    ></textarea>
    <p v-else class="text-[13px] text-ink-2">笔记在页面加载后可用（仅存本设备）。</p>
    <p class="meta-mono mt-2 text-[11px] text-ink-2">{{ charCount }} 字 · 随导出/导入迁移</p>
  </div>
</template>
