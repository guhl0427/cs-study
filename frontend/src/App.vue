<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import StorageBanner from '@/components/layout/StorageBanner.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import { useUserDataStore } from '@/stores/userData'
import { useClientMounted } from '@/composables/useClientMounted'

const ud = useUserDataStore()
const mounted = useClientMounted()
const router = useRouter()

// 装载本地档案/进度（仅客户端；SSG 预渲染与水合首帧均为空档案，避免 hydration mismatch）
onMounted(() => {
  ud.init()
})

/* 全局搜索快捷键 ⌘K / Ctrl+K（F6，components.md SearchInput） */
function onGlobalKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    router.push('/search')
  }
}
onMounted(() => window.addEventListener('keydown', onGlobalKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey))
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <!-- 存储不可用 / 隐私模式：全局警示（原则 5「隐私可见」） -->
    <StorageBanner v-if="mounted && ud.showStorageWarning" />
    <main class="flex-1">
      <router-view />
    </main>
    <AppFooter />
    <ToastHost />
  </div>
</template>
