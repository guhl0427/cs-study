/** 内容纠错反馈（F3.6）：有仓库配置 → 跳 GitHub Issue；未配置 → 复制反馈模板 */
import { contentApi } from '@/api'
import { useUiStore } from '@/stores/ui'

export async function openFeedback(pagePath: string) {
  const url = contentApi.getSite().feedbackUrl
  if (url) {
    window.open(url, '_blank', 'noopener')
    return
  }
  const tpl = `【内容反馈】\n页面：${pagePath}\n问题描述：\n修改建议：\n`
  try {
    await navigator.clipboard.writeText(tpl)
    useUiStore().toast('ok', '反馈模板已复制到剪贴板')
  } catch {
    useUiStore().toast('error', '复制失败，请手动记录问题')
  }
}
