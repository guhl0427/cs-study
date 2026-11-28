<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { contentApi } from '@/api'
import { useUserDataStore } from '@/stores/userData'
import { useClientMounted } from '@/composables/useClientMounted'
import { dateKey } from '@/lib/format'
import { secondsInLastDays } from '@/lib/time'

/**
 * 学习里程碑分享卡（回访留存层）：canvas 绘制蓝图风格学习卡 → PNG 下载。
 * 色值读当前主题的语义令牌，浅色/深色都成立；纯本机绘制，无网络请求。
 */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const ud = useUserDataStore()
const mounted = useClientMounted()
const canvasEl = ref<HTMLCanvasElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    await nextTick()
    if (mounted.value) draw()
  },
)

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

const FONT = `400 16px 'PingFang SC', 'HarmonyOS Sans SC', 'MiSans', 'Noto Sans SC', 'Microsoft YaHei', sans-serif`

function draw() {
  const canvas = canvasEl.value
  if (!canvas) return
  const W = 720
  const H = 960
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  const page = cssVar('--color-page', '#f1f6fa')
  const surface = cssVar('--color-surface', '#ffffff')
  const ink = cssVar('--color-ink', '#14293d')
  const ink2 = cssVar('--color-ink-2', '#52677c')
  const line = cssVar('--color-line', '#c6d8e4')
  const lineStrong = cssVar('--color-line-strong', '#7fa2bc')
  const accent = cssVar('--color-accent', '#1b62a6')
  const warn = cssVar('--color-warn', '#8a5a11')

  // 底色 + 网格纸底纹
  ctx.fillStyle = page
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = line
  ctx.globalAlpha = 0.35
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= W; x += 24) {
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, H)
  }
  for (let y = 0; y <= H; y += 24) {
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(W, y + 0.5)
  }
  ctx.stroke()
  ctx.globalAlpha = 1

  // 中央贴片
  const px = 40
  const py = 72
  const pw = W - px * 2
  const ph = H - py * 2 - 48
  ctx.fillStyle = surface
  ctx.fillRect(px, py, pw, ph)
  ctx.strokeStyle = lineStrong
  ctx.lineWidth = 1.5
  ctx.strokeRect(px + 0.5, py + 0.5, pw, ph)

  // 抬头：色块 + 标题
  ctx.fillStyle = accent
  ctx.fillRect(px + 28, py + 30, 14, 14)
  ctx.fillStyle = ink
  ctx.font = `800 30px 'PingFang SC', 'HarmonyOS Sans SC', 'MiSans', 'Microsoft YaHei', sans-serif`
  ctx.fillText('cs-study 学习卡', px + 56, py + 45)

  ctx.fillStyle = ink2
  ctx.font = FONT
  ctx.fillText('打开就能学，进度随身存', px + 28, py + 78)

  // 图纸标题栏（四格）
  const totalSeconds = Object.values(ud.timeLog).reduce(
    (sum, day) => sum + Object.values(day).reduce((s, v) => s + v, 0),
    0,
  )
  const stat = (v: string | number) => String(v)
  const cells = [
    { label: '完成知识点', value: stat(ud.totalDone) },
    { label: '学习天数', value: stat(ud.learningDays) },
    { label: '连续天数', value: `${stat(ud.streakDays)} 天` },
    { label: '累计时长', value: `${Math.round((totalSeconds / 3600) * 10) / 10} h` },
  ]
  const cw = (pw - 56) / 4
  cells.forEach((c, i) => {
    const cx = px + 28 + i * cw
    ctx.strokeStyle = line
    ctx.lineWidth = 1
    ctx.strokeRect(cx + 0.5, py + 104, cw - 12, 84)
    ctx.fillStyle = ink2
    ctx.font = `400 13px 'PingFang SC', 'Microsoft YaHei', sans-serif`
    ctx.fillText(c.label, cx + 10, py + 132)
    ctx.fillStyle = ink
    ctx.font = `700 30px 'PingFang SC', 'Microsoft YaHei', sans-serif`
    ctx.fillText(c.value, cx + 10, py + 170)
  })

  // 档案行
  ctx.fillStyle = ink
  ctx.font = `700 26px 'PingFang SC', 'Microsoft YaHei', sans-serif`
  ctx.fillText(`${ud.profile.avatarId || '🙂'} ${ud.profile.nickname || '同学'}`, px + 28, py + 238)
  const pathSlug = ud.profile.activePathId ?? ud.guide?.recommendedPathSlug ?? ''
  const pathName = pathSlug ? (contentApi.getPath(pathSlug)?.name ?? '') : '尚未选定路线'
  ctx.fillStyle = ink2
  ctx.font = FONT
  ctx.fillText(`当前路线：${pathName}`, px + 28, py + 274)
  if (ud.profile.startDate) {
    ctx.fillText(`学习起始日：${ud.profile.startDate}`, px + 28, py + 300)
  }

  // 里程碑语句
  const milestone =
    ud.streakDays >= 7
      ? `已连续学习 ${ud.streakDays} 天，节奏已经很稳了`
      : ud.totalDone >= 20
        ? `已完成 ${ud.totalDone} 个知识点，地基越打越牢`
        : '每一格进度，都是自己挣来的'
  ctx.fillStyle = warn
  ctx.font = `500 17px 'PingFang SC', 'Microsoft YaHei', sans-serif`
  ctx.fillText(milestone, px + 28, py + 344)

  // 底部：日期 + 站名
  ctx.fillStyle = ink2
  ctx.font = `400 13px 'PingFang SC', 'Microsoft YaHei', sans-serif`
  ctx.fillText(dateKey(new Date()), px + 28, py + ph - 40)
  ctx.textAlign = 'right'
  ctx.fillText('cs-study · 学习地图（纯前端版）', px + pw - 28, py + ph - 40)
  ctx.textAlign = 'left'
}

function download() {
  const url = canvasEl.value?.toDataURL('image/png')
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = `cs-study-学习卡-${dateKey(new Date()).replaceAll('-', '')}.png`
  a.click()
}

const weekHours = () => Math.round((secondsInLastDays(ud.timeLog, 7) / 3600) * 10) / 10
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-ink/40" aria-hidden="true" @click="emit('close')"></div>
      <div
        class="relative w-full max-w-[380px] rounded-panel border border-line-strong bg-surface p-4 shadow-overlay"
        role="dialog"
        aria-label="学习里程碑卡"
      >
        <p class="meta-mono mb-3">学习卡 · 可保存分享（纯本机绘制）</p>
        <canvas ref="canvasEl" class="w-full rounded-card border border-line" width="720" height="960"></canvas>
        <div class="mt-4 flex items-center gap-2">
          <button class="btn btn-primary flex-1" type="button" @click="download">保存 PNG</button>
          <button class="btn btn-ghost" type="button" @click="emit('close')">关闭</button>
        </div>
        <p class="meta-mono mt-2 text-[11px] text-ink-2">
          本周实际学习 {{ weekHours() }} 小时 · 色值随当前主题
        </p>
      </div>
    </div>
  </Teleport>
</template>
