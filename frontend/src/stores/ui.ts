/** UI 全局状态：Toast 队列（右下角浮出，最多 3 条，components.md Toast） */
import { defineStore } from 'pinia'

export interface Toast {
  id: number
  kind: 'ok' | 'error' | 'info'
  text: string
}

let seq = 0

export const useUiStore = defineStore('ui', {
  state: () => ({
    toasts: [] as Toast[],
  }),
  actions: {
    toast(kind: Toast['kind'], text: string) {
      const id = ++seq
      this.toasts.push({ id, kind, text })
      if (this.toasts.length > 3) this.toasts.shift()
      window.setTimeout(() => this.dismiss(id), 3200)
    },
    dismiss(id: number) {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    },
  },
})
