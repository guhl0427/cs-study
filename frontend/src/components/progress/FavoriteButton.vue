<script setup lang="ts">
import { computed } from 'vue'
import { IconStar, IconStarFilled } from '@tabler/icons-vue'
import { useUserDataStore } from '@/stores/userData'
import { useClientMounted } from '@/composables/useClientMounted'
import type { FavTargetType } from '@/types/user'

/** 收藏（F7.3）：课程/知识点统一出口，乐观更新 + Toast */
const props = defineProps<{
  targetType: FavTargetType
  targetId: string
  title: string
}>()

const ud = useUserDataStore()
const mounted = useClientMounted()
const faved = computed(() => mounted.value && ud.isFavorite(props.targetType, props.targetId))

function toggle() {
  ud.toggleFavorite(props.targetType, props.targetId, props.title)
}
</script>

<template>
  <button
    class="btn btn-ghost btn-sm"
    :class="faved ? 'border-warn text-warn' : ''"
    type="button"
    :aria-pressed="faved"
    :aria-label="faved ? `取消收藏：${title}` : `收藏：${title}`"
    @click="toggle"
  >
    <IconStar v-if="!faved" size="15" stroke-width="1.5" />
    <IconStarFilled v-else size="15" stroke-width="1.5" />
    {{ faved ? '已收藏' : '收藏' }}
  </button>
</template>
