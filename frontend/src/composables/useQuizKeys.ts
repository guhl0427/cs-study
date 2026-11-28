import { onBeforeUnmount, onMounted } from 'vue'

export interface QuizKeyHandlers {
  /** 总开关（题目不存在 / 已完成时 false） */
  enabled: () => boolean
  /** 当前选择题的选项数（填空题返回 0，数字键不拦截） */
  optionsCount: () => number
  onSelect: (index: number) => void
  canSubmit: () => boolean
  onSubmit: () => void
  canNext: () => boolean
  onNext: () => void
}

/**
 * 测验键盘作答（回访留存层）：数字键 1–N 选选项、Enter 提交 / 下一题。
 * 输入类元素聚焦时不拦截——填空题输入框用原生回车提交。
 */
export function useQuizKeys(handlers: QuizKeyHandlers): void {
  function onKey(e: KeyboardEvent) {
    if (!handlers.enabled()) return
    const t = e.target as HTMLElement | null
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) {
      return
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return

    if (/^[1-9]$/.test(e.key)) {
      const idx = Number(e.key) - 1
      if (idx < handlers.optionsCount()) {
        e.preventDefault()
        handlers.onSelect(idx)
      }
      return
    }
    if (e.key === 'Enter') {
      if (handlers.canSubmit()) {
        e.preventDefault()
        handlers.onSubmit()
      } else if (handlers.canNext()) {
        e.preventDefault()
        handlers.onNext()
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}
