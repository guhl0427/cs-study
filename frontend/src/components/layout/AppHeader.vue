<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { IconMenu2, IconSearch, IconX } from '@tabler/icons-vue'
import { useUserDataStore } from '@/stores/userData'
import { useClientMounted } from '@/composables/useClientMounted'

const route = useRoute()
const ud = useUserDataStore()
const mounted = useClientMounted()
const drawerOpen = ref(false)

const navs = [
  { label: '首页', to: '/', name: 'home' },
  { label: '全部领域', to: '/explore', name: 'explore' },
  { label: '找方向', to: '/guide', name: 'guide' },
  { label: '个人中心', to: '/profile', name: 'profile' },
]

/** 主 CTA（F1.5）：有学习记录 → 继续学习；无 → 开始学习（引导问答） */
const ctaTo = computed(() =>
  mounted.value && ud.lastVisit
    ? {
        name: 'lesson',
        params: { courseSlug: ud.lastVisit.courseSlug, lessonSlug: ud.lastVisit.lessonSlug },
      }
    : '/guide',
)
const ctaLabel = computed(() => (mounted.value && ud.lastVisit ? '继续学习' : '开始学习'))
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-line bg-surface">
    <div class="container-wide flex h-14 items-center gap-4">
      <RouterLink to="/" class="flex items-center gap-2 text-[15px] font-extrabold text-ink">
        <span class="h-2.5 w-2.5 rounded-[2px] bg-accent" aria-hidden="true"></span>
        cs-study
      </RouterLink>

      <nav class="hidden items-center gap-5 md:flex" aria-label="主导航">
        <RouterLink
          v-for="n in navs"
          :key="n.to"
          :to="n.to"
          class="border-b-2 pb-1 text-[13px] transition-colors"
          :class="
            route.name === n.name
              ? 'border-accent font-bold text-ink'
              : 'border-transparent text-ink-2 hover:text-ink'
          "
        >
          {{ n.label }}
        </RouterLink>
      </nav>

      <!-- 全局搜索（F6）：桌面胶囊入口 + ⌘K -->
      <RouterLink
        to="/search"
        class="ml-auto hidden items-center gap-2 rounded-full border border-line bg-inset px-3 py-1.5 text-caption text-ink-2 hover:border-line-strong md:flex"
        aria-label="搜索课程与知识点（快捷键 Ctrl+K）"
      >
        <IconSearch size="14" stroke-width="1.5" />
        搜索课程 / 知识点…
        <span class="meta-mono ml-1 opacity-80">⌘K</span>
      </RouterLink>
      <RouterLink
        to="/search"
        class="ml-auto flex h-8 w-8 items-center justify-center rounded-card border border-line text-ink-2 md:hidden"
        aria-label="搜索"
      >
        <IconSearch size="16" stroke-width="1.5" />
      </RouterLink>

      <RouterLink :to="ctaTo" class="btn btn-primary btn-sm ml-auto md:ml-0">
        {{ ctaLabel }}
      </RouterLink>

      <button
        class="btn btn-ghost btn-sm px-2 md:hidden"
        type="button"
        aria-label="打开菜单"
        @click="drawerOpen = true"
      >
        <IconMenu2 size="18" stroke-width="1.5" />
      </button>
    </div>

    <!-- 移动端抽屉 -->
    <Teleport to="body">
      <div v-if="drawerOpen" class="fixed inset-0 z-50 md:hidden">
        <div class="absolute inset-0 bg-ink/40" @click="drawerOpen = false"></div>
        <div
          class="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line-strong bg-surface p-4 shadow-overlay"
          role="dialog"
          aria-label="导航菜单"
        >
          <div class="flex items-center justify-between">
            <span class="font-extrabold">cs-study</span>
            <button class="btn btn-ghost btn-sm px-2" type="button" aria-label="关闭菜单" @click="drawerOpen = false">
              <IconX size="18" stroke-width="1.5" />
            </button>
          </div>
          <nav class="mt-4 flex flex-col gap-1" aria-label="移动端导航">
            <RouterLink
              v-for="n in navs"
              :key="n.to"
              :to="n.to"
              class="rounded-card px-3 py-2.5 text-body-ui"
              :class="route.name === n.name ? 'bg-accent-subtle font-bold text-accent' : 'text-ink-2'"
              @click="drawerOpen = false"
            >
              {{ n.label }}
            </RouterLink>
          </nav>
        </div>
      </div>
    </Teleport>
  </header>
</template>
