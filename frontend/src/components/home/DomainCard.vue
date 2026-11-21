<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { IconCode } from '@tabler/icons-vue'
import { domainIcons } from '@/lib/icons'
import DifficultyBadge from '@/components/ui/DifficultyBadge.vue'
import type { Domain } from '@/types/content'

const props = defineProps<{ domain: Domain }>()
const Icon = domainIcons[props.domain.icon] ?? IconCode
</script>

<template>
  <RouterLink
    :to="`/domain/${domain.slug}`"
    class="card-plate card-hover block p-5"
    :aria-label="`进入领域：${domain.name}`"
  >
    <span class="flex h-10 w-10 items-center justify-center rounded-card bg-accent-subtle text-accent">
      <Icon size="22" stroke-width="1.5" />
    </span>
    <h3 class="mt-3 text-section font-bold text-ink">{{ domain.name }}</h3>
    <p class="mt-1.5 min-h-[2.6em] text-[13px] leading-relaxed text-ink-2">{{ domain.summary }}</p>
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <span class="meta-mono">{{ domain.courseCount }} 门课程</span>
      <DifficultyBadge v-if="domain.difficultySpan" :level="domain.difficultySpan" />
    </div>
  </RouterLink>
</template>
