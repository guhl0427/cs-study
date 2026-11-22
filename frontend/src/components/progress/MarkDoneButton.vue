<script setup lang="ts">
import { computed } from 'vue'
import { IconCheck } from '@tabler/icons-vue'
import { useUserDataStore } from '@/stores/userData'
import { useClientMounted } from '@/composables/useClientMounted'
import type { LessonMeta } from '@/types/content'

/** 标记完成（F4.1）：未开始 → 描边按钮；已完成 → 实底 ✓，hover 浮现「取消完成」 */
const props = defineProps<{ lesson: LessonMeta }>()

const ud = useUserDataStore()
const mounted = useClientMounted()

const isDone = computed(() => mounted.value && ud.progress[props.lesson.id]?.status === 'done')

function toggle() {
  if (isDone.value) {
    ud.unmarkDone(props.lesson.id)
  } else {
    ud.markDone(props.lesson)
  }
}
</script>

<template>
  <div v-if="isDone" class="group flex items-center gap-2">
    <button class="btn btn-sm bg-ok text-on-ok hover:bg-ok" type="button" :aria-label="`已完成：${lesson.title}`" @click="toggle">
      <IconCheck size="15" stroke-width="2" />
      已完成
    </button>
    <button
      class="btn btn-text btn-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      type="button"
      @click="toggle"
    >
      取消完成
    </button>
  </div>
  <button v-else class="btn btn-primary btn-sm" type="button" @click="toggle">○ 标记完成</button>
</template>
