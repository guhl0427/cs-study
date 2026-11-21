<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()

const borderClass: Record<string, string> = {
  ok: 'border-l-ok',
  error: 'border-l-danger',
  info: 'border-l-line-strong',
}
</script>

<template>
  <div class="pointer-events-none fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="t in ui.toasts"
        :key="t.id"
        class="pointer-events-auto rounded-card border border-line border-l-4 bg-surface px-3.5 py-2.5 text-[13px] text-ink shadow-overlay"
        :class="borderClass[t.kind]"
      >
        {{ t.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity var(--dur-base) var(--ease-soft), transform var(--dur-base) var(--ease-soft);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
