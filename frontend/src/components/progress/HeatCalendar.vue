<script setup lang="ts">
import { computed } from 'vue'
import { dateKey } from '@/lib/format'

/**
 * 打卡日历（F4.4）：数据由 progress 推导（不单独存储）。
 * - view="year"（默认）：近 N 周逐日热力（桌面）
 * - view="month"：当月网格（移动端，设计稿 08 页）
 */
const props = withDefaults(
  defineProps<{
    counts: Record<string, number>
    weeks?: number
    ariaLabel?: string
    view?: 'year' | 'month'
  }>(),
  { weeks: 52, view: 'year' },
)

interface Cell {
  date: string
  count: number
  level: 0 | 1 | 2 | 3
}

const levelOf = (count: number): 0 | 1 | 2 | 3 =>
  count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3

const levelCls = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3']

/* ---- 年视图：52 周逐日列 ---- */
const columns = computed<Cell[][]>(() => {
  const end = new Date()
  end.setDate(end.getDate() + (6 - end.getDay())) // 末列对齐周六
  const total = props.weeks * 7
  const cells: Cell[] = []
  for (let i = total - 1; i >= 0; i -= 1) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const key = dateKey(d)
    const count = props.counts[key] ?? 0
    cells.push({ date: key, count, level: levelOf(count) })
  }
  const out: Cell[][] = []
  for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7))
  return out
})

const totalDays = computed(() => columns.value.flat().filter((c) => c.count > 0).length)

/* ---- 月视图：当月 7 列网格 ---- */
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] // 与 Date.getDay 对齐（0=周日）

interface MonthCell {
  day: number
  date: string
  count: number
  level: 0 | 1 | 2 | 3
}

const month = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const monthIdx = now.getMonth()
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
  const lead = new Date(year, monthIdx, 1).getDay()
  const blanks = Array.from({ length: lead }, () => null)
  const cells: MonthCell[] = []
  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(year, monthIdx, day)
    const key = dateKey(d)
    const count = props.counts[key] ?? 0
    cells.push({ day, date: key, count, level: levelOf(count) })
  }
  return { blanks, cells, label: `${year} 年 ${monthIdx + 1} 月` }
})
</script>

<template>
  <!-- 年视图 -->
  <figure v-if="view === 'year'" class="m-0">
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

  <!-- 月视图（移动端默认） -->
  <figure v-else class="m-0">
    <p class="meta-mono mb-2">{{ month.label }}</p>
    <div class="grid grid-cols-7 gap-1 text-center" role="img" :aria-label="`当月学习日历：共 ${month.cells.filter((c) => c.count > 0).length} 天有学习记录`">
      <span v-for="w in WEEKDAYS" :key="w" class="text-[11px] text-ink-2" aria-hidden="true">{{ w }}</span>
      <span v-for="(_, i) in month.blanks" :key="`b${i}`"></span>
      <span
        v-for="cell in month.cells"
        :key="cell.date"
        class="flex aspect-square flex-col items-center justify-center rounded-node text-[11px]"
        :class="[levelCls[cell.level], cell.level >= 2 ? 'text-ink' : cell.level === 1 ? 'text-ink' : 'text-ink-2']"
        :title="`${cell.date} · ${cell.count > 0 ? `完成 ${cell.count} 个知识点` : '无记录'}`"
      >
        {{ cell.day }}
      </span>
    </div>
    <figcaption class="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-ink-2">
      少
      <span v-for="lv in 4" :key="lv" class="h-[10px] w-[10px] rounded-[2px]" :class="levelCls[lv - 1]"></span>
      多
    </figcaption>
  </figure>
</template>
