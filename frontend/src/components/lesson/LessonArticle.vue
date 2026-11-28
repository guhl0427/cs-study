<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 知识点正文容器：渲染构建期编译好的 HTML（md-body 排版 + Shiki blueprint-draft）。
 * 「复制」与「运行」按钮均由构建期注入，本组件做事件委托——预渲染 HTML 中按钮即存在。
 * 运行沙箱：sandbox="allow-scripts" 的 srcdoc iframe（无同源，无法触碰父页面 DOM），
 * 内部重定向 console / window.onerror 并 postMessage 回传，由 onMessage 按 event.source 匹配输出。
 */
const props = defineProps<{ html: string }>()
const root = ref<HTMLElement | null>(null)

const RESET_MS = 1200

async function onCopy(btn: HTMLElement) {
  const code = btn.closest('.code-block')?.querySelector('pre code')?.textContent ?? ''
  try {
    await navigator.clipboard.writeText(code)
    btn.textContent = '已复制 ✓'
  } catch {
    btn.textContent = '复制失败'
  }
  window.setTimeout(() => {
    btn.textContent = '复制'
  }, RESET_MS)
}

interface PlayMessage {
  __csPlay?: boolean
  kind?: 'log' | 'warn' | 'error' | 'end'
  text?: string
}

function onMessage(ev: MessageEvent) {
  const data = ev.data as PlayMessage | undefined
  if (!data?.__csPlay) return
  const frames = Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe.code-run-frame'))
  const frame = frames.find((f) => f.contentWindow === ev.source)
  if (!frame) return
  const figure = frame.closest('.code-block')
  const out = figure?.querySelector<HTMLElement>('.code-out')
  const btn = figure?.querySelector<HTMLElement>('.code-run')
  if (!out) return
  if (!out.dataset.started) {
    out.dataset.started = '1'
    out.textContent = ''
  }
  if (data.kind === 'end') {
    if (!out.childElementCount) {
      const empty = document.createElement('div')
      empty.className = 'code-out-line'
      empty.textContent = '（无 console 输出）'
      out.appendChild(empty)
    }
    if (btn) btn.textContent = '运行 ▶'
    return
  }
  const line = document.createElement('div')
  line.className = `code-out-line code-out-${data.kind === 'log' ? 'log' : data.kind === 'warn' ? 'warn' : 'error'}`
  line.textContent = data.text ?? ''
  out.appendChild(line)
}

/** 运行沙箱：用户代码（构建期内容，白名单保证无原始 HTML）嵌入 harness；闭合 script 标签需转义防提前截断 */
function buildHarness(code: string): string {
  const safe = code.replace(/<\/script/gi, '<\\/script')
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}</style></head><body><script>
(function () {
  var fmt = function (v, depth) {
    try {
      if (typeof v === 'string') return v
      if (typeof v === 'function') return '[Function ' + (v.name || 'anonymous') + ']'
      if (v === null) return 'null'
      if (v === undefined) return 'undefined'
      if (Array.isArray(v)) return depth > 3 ? '[…]' : '[' + v.map(function (x) { return fmt(x, (depth || 0) + 1) }).join(', ') + ']'
      if (v instanceof Error) return v.name + ': ' + v.message
      if (typeof v === 'object') {
        if (depth > 3) return '{…}'
        return '{ ' + Object.entries(v).slice(0, 20).map(function (kv) { return kv[0] + ': ' + fmt(kv[1], (depth || 0) + 1) }).join(', ') + ' }'
      }
      return String(v)
    } catch (e) { return String(v) }
  }
  var send = function (kind, args) {
    parent.postMessage({ __csPlay: true, kind: kind, text: Array.prototype.map.call(args, function (a) { return fmt(a, 0) }).join(' ') }, '*')
  }
  console.log = console.info = function () { send('log', arguments) }
  console.warn = function () { send('warn', arguments) }
  console.error = function () { send('error', arguments) }
  window.onerror = function (msg) { send('error', [msg]) }
  try {
${safe}
  } catch (e) { send('error', [e]) }
  send('end', [])
})()
</scr` + `ipt></body></html>`
}

function onClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const copyBtn = target.closest('.code-copy') as HTMLElement | null
  if (copyBtn) {
    void onCopy(copyBtn)
    return
  }
  const runBtn = target.closest('.code-run') as HTMLElement | null
  if (!runBtn) return
  const figure = runBtn.closest('.code-block')
  const code = figure?.querySelector('pre code')?.textContent ?? ''
  const out = figure?.querySelector<HTMLElement>('.code-out')
  if (!figure || !out) return
  delete out.dataset.started
  out.hidden = false
  out.textContent = '运行中…'
  figure.querySelectorAll('iframe.code-run-frame').forEach((f) => f.remove())
  const iframe = document.createElement('iframe')
  iframe.className = 'code-run-frame'
  iframe.sandbox.add('allow-scripts')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.display = 'none'
  iframe.srcdoc = buildHarness(code)
  figure.appendChild(iframe)
  runBtn.textContent = '运行中…'
}

onMounted(() => {
  root.value?.addEventListener('click', onClick)
  window.addEventListener('message', onMessage)
})

onBeforeUnmount(() => {
  root.value?.removeEventListener('click', onClick)
  window.removeEventListener('message', onMessage)
})

// v-html 内容来自构建期自产内容（无用户输入），白名单由 markdown-it html:false 保证
const _html = props.html
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div ref="root" class="md-body" v-html="_html"></div>
</template>
