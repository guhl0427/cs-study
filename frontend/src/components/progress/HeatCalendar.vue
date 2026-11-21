<script setup lang="ts">
import { computed } from 'vue'
import { dateKey } from '@/lib/format'

/**
 * 打卡日历（F4.4）：近 N 周逐日热力，数据由 progress 推导（不单独存储）。
 * 网格外层为图类容器（GridPaper），图例固定右下（components.md）。
 */
const props = withDefaults(
  defineProps<{
    counts: Record<string, number>
    weeks?: number
    ariaLabel?: string
  }>(),
  { weeks: 52 },
)

interface Cell {
  date: string
  count: number
  level: 0 | 1 | 2 | 3
}

const columns = computed<Cell[][]>(() => {
  const end = new Date()
  // 让最末列对齐到本周周六，保持 7 行整齐
  end.setDate(end.getDate() + (6 - end.getDay()))
  const total = props.weeks * 7
  const cells: Cell[] = []
  for (let i = total - 1; i >= 0; i -= 1) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const key = dateKey(d)
    const count = props.counts[key] ?? 0
    cells.push({
      date: key,
      count,
      level: count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3,
    })
  }
  const out: Cell[][] = []
  for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7))
  return out
})

const levelCls = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3']

const totalDays = computed(() => columns.value.flat().filter((c) => c.count > 0).length)
</script>

<template>
  <figure class="m-0">
    <div
      class="scroll-x flex gap-[3px] overflow-x-auto pb-1"
      role="img"
      :aria-label="ariaLabel ?? `学习日历：最近 ${weeks} 周共学习 ${totalDays} 天`"
    >
      <div v-for="(col, ci) in columns" :key="ci" class="flex flex-col gap-[3px]">
        <span
          v-for="cell in col"
          :key="cell.date"
          class="h-[11px] w-[11px] rounded-[2px]"
          :class="levelCls[cell.level]"
          :title="`${cell.date} · ${cell.count > 0 ? `完成 ${cell.count} 个知识点` : '无记录'}`"
        ></span>
      </div>
    </div>
    <figcaption class="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-ink-2">
      少
      <span v-for="lv in 4" :key="lv" class="h-[10px] w-[10px] rounded-[2px]" :class="levelCls[lv - 1]"></span>
      多
    </figcaption>
  </figure>
</template>
