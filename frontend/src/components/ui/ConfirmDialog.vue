<script setup lang="ts">
/**
 * 确认弹窗（破坏性操作专用，components.md §8）：
 * 标题说后果、正文说不可逆性、按钮用动词，不出现「确认/OK」。
 */
import { IconX } from '@tabler/icons-vue'

defineProps<{
  open: boolean
  title: string
  body: string
  confirmText: string
  danger?: boolean
}>()

defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-ink/40" @click="$emit('cancel')"></div>
      <div
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="relative w-full max-w-md rounded-panel border border-line-strong bg-surface p-5 shadow-overlay"
      >
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-section font-bold text-ink">{{ title }}</h2>
          <button class="btn btn-ghost btn-sm border-none px-1" type="button" aria-label="关闭" @click="$emit('cancel')">
            <IconX size="16" stroke-width="1.5" />
          </button>
        </div>
        <p class="mt-2 text-body-ui text-ink-2">{{ body }}</p>
        <div class="mt-5 flex justify-end gap-3">
          <button class="btn btn-ghost" type="button" @click="$emit('cancel')">取消</button>
          <button class="btn" :class="danger ? 'btn-danger' : 'btn-primary'" type="button" @click="$emit('confirm')">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
