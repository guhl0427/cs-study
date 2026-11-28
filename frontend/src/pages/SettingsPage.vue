<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useUserDataStore } from '@/stores/userData'
import { useUiStore } from '@/stores/ui'
import { useClientMounted } from '@/composables/useClientMounted'
import { usePageTitle } from '@/composables/usePageTitle'
import { parseImportFile, usageStats, type UsageStats } from '@/storage/repository'
import { formatBytes, formatDateTime } from '@/lib/format'
import type { ExportFile, ImportStrategy } from '@/types/user'

usePageTitle('数据管理')

const router = useRouter()
const ud = useUserDataStore()
const ui = useUiStore()
const mounted = useClientMounted()

/* ---- 概览（客户端读取本机用量） ---- */
const stats = ref<UsageStats>({ bytes: 0, progressCount: 0, favoritesCount: 0, answersCount: 0 })
onMounted(() => {
  stats.value = usageStats()
})

/* ---- 导出（F7.4） ---- */
function doExport() {
  const filename = ud.exportData()
  if (filename) ui.toast('ok', `已导出：${filename}`)
}

/* ---- 导入（F7.5） ---- */
const fileInput = ref<HTMLInputElement | null>(null)
const strategy = ref<ImportStrategy>('merge')
const importError = ref('')
const overwritePending = ref<ExportFile | null>(null)
const showOverwriteConfirm = ref(false)

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 允许重复选择同一文件
  importError.value = ''
  if (!file) return
  const parsed = parseImportFile(await file.text())
  if (!parsed.ok) {
    importError.value = parsed.error ?? '文件无法识别'
    return
  }
  if (strategy.value === 'overwrite') {
    overwritePending.value = parsed.file!
    showOverwriteConfirm.value = true
    return
  }
  applyImport(parsed.file!, 'merge')
}

function confirmOverwrite() {
  showOverwriteConfirm.value = false
  if (overwritePending.value) applyImport(overwritePending.value, 'overwrite')
  overwritePending.value = null
}

function applyImport(file: ExportFile, mode: ImportStrategy) {
  const s = ud.importData(file, mode)
  ui.toast('ok', `导入完成：进度 ${s.progress} 条 · 收藏 ${s.favorites} 条 · 作答 ${s.answers} 条 · 笔记 ${s.notes} 条`)
  stats.value = usageStats()
}

/* ---- 清空（F7.6） ---- */
const showClearConfirm = ref(false)

function confirmClear() {
  showClearConfirm.value = false
  ud.clearAllData()
  ui.toast('ok', '本机数据已清空，回到游客状态')
  router.push('/')
}
</script>

<template>
  <div class="container-text pt-8">
    <PageHeader
      title="数据管理"
      subtitle="你的全部学习数据都保存在本机。导出文件就是你的「存档」——换设备、换浏览器都靠它。"
    />

    <!-- ① 本机数据概览 -->
    <section class="grid-zone rounded-card border border-line-strong p-5">
      <div class="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
        <div class="bg-surface px-3.5 py-2.5">
          <span class="block text-[11px] text-ink-2">存储占用</span>
          <b class="mt-0.5 block font-mono text-[13px] text-ink">{{ mounted ? formatBytes(stats.bytes) : '—' }} / 1MB</b>
        </div>
        <div class="bg-surface px-3.5 py-2.5">
          <span class="block text-[11px] text-ink-2">学习记录</span>
          <b class="mt-0.5 block font-mono text-[13px] text-ink">{{ mounted ? stats.progressCount : 0 }} 条</b>
        </div>
        <div class="bg-surface px-3.5 py-2.5">
          <span class="block text-[11px] text-ink-2">收藏</span>
          <b class="mt-0.5 block font-mono text-[13px] text-ink">{{ mounted ? stats.favoritesCount : 0 }} 条</b>
        </div>
        <div class="bg-surface px-3.5 py-2.5">
          <span class="block text-[11px] text-ink-2">上次导出</span>
          <b class="mt-0.5 block font-mono text-[13px] text-ink">{{ mounted ? formatDateTime(ud.meta.lastExportAt) : '—' }}</b>
        </div>
      </div>
    </section>

    <!-- ② 导出 -->
    <section class="card-plate mt-6 p-5">
      <h2 class="text-section font-bold text-ink">导出数据</h2>
      <p class="mt-1.5 text-[13px] text-ink-2">
        导出为 JSON 文件（含 schema 版本号），包含档案、进度、打卡、收藏、作答、找方向结果、笔记与学习时长。可随时导回。
      </p>
      <button class="btn btn-primary mt-4" type="button" @click="doExport">导出数据</button>
    </section>

    <!-- ③ 导入 -->
    <section class="card-plate mt-4 p-5">
      <h2 class="text-section font-bold text-ink">导入数据</h2>
      <p class="mt-1.5 text-[13px] text-ink-2">选择此前导出的备份文件恢复。</p>

      <fieldset class="mt-4">
        <legend class="meta-mono mb-2">冲突策略</legend>
        <div class="space-y-1.5 text-[14px]">
          <label class="flex items-center gap-2">
            <input v-model="strategy" type="radio" value="merge" />
            <b>合并</b><span class="text-ink-2">（推荐）：同名记录取较新，不删除现有数据</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="strategy" type="radio" value="overwrite" />
            <b>覆盖</b><span class="text-ink-2">：导入文件完全替换本机数据（需二次确认）</span>
          </label>
        </div>
      </fieldset>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onFileChange" />
        <button class="btn btn-ghost" type="button" @click="fileInput?.click()">选择备份文件…</button>
        <span v-if="importError" class="text-[13px] text-danger-text">{{ importError }}</span>
      </div>
    </section>

    <!-- ④ 清空（危险区） -->
    <section class="mt-4 rounded-card border border-danger bg-danger-subtle p-5">
      <h2 class="text-section font-bold text-danger-text">危险区</h2>
      <p class="mt-1.5 text-[13px] text-danger-text">
        清空本机全部数据（档案 / 进度 / 打卡 / 收藏 / 作答），不可恢复。清空前建议先导出一份备份。
      </p>
      <button class="btn btn-danger mt-4" type="button" @click="showClearConfirm = true">清空本机数据</button>
    </section>

    <!-- 常驻提示（原则 5） -->
    <p class="mt-8 text-caption text-ink-2">进度仅保存在本设备 · 本站不收集任何数据 · 不存在云同步。</p>

    <!-- 二次确认弹窗 -->
    <ConfirmDialog
      :open="showOverwriteConfirm"
      title="导入将完全替换本机数据"
      body="覆盖策略会用备份文件的内容替换本机现有的全部学习数据，此操作不可恢复。确定要继续吗？"
      confirm-text="替换本机数据"
      danger
      @confirm="confirmOverwrite"
      @cancel="showOverwriteConfirm = false; overwritePending = null"
    />
    <ConfirmDialog
      :open="showClearConfirm"
      title="清空本机全部学习数据"
      body="将删除档案、进度、打卡、收藏与作答记录，且不可恢复。建议先在上方导出一份备份。确定要清空吗？"
      confirm-text="清空数据"
      danger
      @confirm="confirmClear"
      @cancel="showClearConfirm = false"
    />
  </div>
</template>
