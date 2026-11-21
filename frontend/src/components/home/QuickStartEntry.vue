<script setup lang="ts">
import { useRouter } from 'vue-router'
import { IconArrowRight } from '@tabler/icons-vue'
import { useUserDataStore } from '@/stores/userData'
import { useUiStore } from '@/stores/ui'
import type { QuickStart } from '@/types/content'

/** 新手快捷入口（F1.3）：直达预设路线并设为当前路线 */
const props = defineProps<{ entry: QuickStart }>()
const router = useRouter()
const ud = useUserDataStore()
const ui = useUiStore()

function start() {
  ud.setActivePath(props.entry.pathSlug)
  ui.toast('ok', '已设为当前路线')
  router.push(`/path/${props.entry.pathSlug}`)
}
</script>

<template>
  <div class="flex items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface p-4">
    <div class="min-w-0 flex-1">
      <p class="text-card font-bold text-ink">{{ entry.title }}</p>
      <p class="mt-0.5 text-[13px] text-ink-2">{{ entry.desc }}</p>
    </div>
    <button class="btn btn-ghost btn-sm shrink-0" type="button" @click="start">
      按此开始
      <IconArrowRight size="14" stroke-width="1.5" />
    </button>
  </div>
</template>
