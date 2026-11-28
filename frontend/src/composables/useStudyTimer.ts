import { onBeforeUnmount, onMounted } from 'vue'
import { useUserDataStore } from '@/stores/userData'

const TICK_SECONDS = 30

/**
 * 知识点学习时长计时（真实时长统计）：
 * - 每 30s 一个 tick，仅「enabled 且页面可见」时累计（后台挂着不算）
 * - enabled 逐 tick 求值：子组件 onMounted 先于 App 的 init()，
 *   以 store 装载完成作为启用条件（与 LessonPage 的 watch(loaded) 同因）
 * - 页面隐藏 / pagehide / 组件卸载时立即落盘，导航走人不丢整段
 * - 仅客户端启动（onMounted），SSG 渲染不受影响
 */
export function useStudyTimer(lessonId: string, enabled: () => boolean): void {
  let pending = 0
  let timer: number | undefined
  let removeListeners: (() => void) | null = null

  function flush() {
    if (pending > 0 && enabled()) {
      useUserDataStore().addStudyTime(lessonId, pending)
      pending = 0
    }
  }

  onMounted(() => {
    timer = window.setInterval(() => {
      if (enabled() && document.visibilityState === 'visible') pending += TICK_SECONDS
      flush()
    }, TICK_SECONDS * 1000)

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    removeListeners = () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
    }
  })

  onBeforeUnmount(() => {
    if (timer !== undefined) window.clearInterval(timer)
    removeListeners?.()
    flush()
  })
}
