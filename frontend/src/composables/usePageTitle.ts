import { toValue, watchEffect, type MaybeRefOrGetter } from 'vue'

/**
 * 页面标题（每页唯一语义，SEO §6）：`${pageTitle} · cs-study`
 * SSR 环境跳过（M2 接入 unhead 后在构建期注入 <title>）。
 */
export function usePageTitle(title: MaybeRefOrGetter<string>) {
  if (typeof document === 'undefined') return
  watchEffect(() => {
    const t = toValue(title)
    document.title = t ? `${t} · cs-study` : 'cs-study · 计算机科学技术学习平台'
  })
}
