/** 内容纠错反馈（F3.6）：仓库已配置 feedbackUrl → 跳 GitHub Issue（预填页面路径与版本）；
 *  未配置 → 复制反馈模板到剪贴板 */
import { contentApi } from '@/api'
import { useUiStore } from '@/stores/ui'

/** 拼装 GitHub Issue 预填链接（导出以便单测：页面上下文必须带进 Issue） */
export function buildFeedbackUrl(base: string, pagePath: string, version: string): string {
  const body = [
    `页面路径：${pagePath}`,
    `内容版本：${version}`,
    '',
    '### 问题描述',
    '',
    '',
    '### 修改建议',
    '',
  ].join('\n')
  const params = new URLSearchParams({ title: `【内容反馈】${pagePath}`, body })
  return `${base.replace(/\/$/, '')}/new?${params.toString()}`
}

export async function openFeedback(pagePath: string) {
  const base = contentApi.getSite().feedbackUrl
  const version = `v${__APP_VERSION__}`
  if (base) {
    window.open(buildFeedbackUrl(base, pagePath, version), '_blank', 'noopener')
    return
  }
  const tpl = `【内容反馈】\n页面：${pagePath}\n版本：${version}\n问题描述：\n修改建议：\n`
  try {
    await navigator.clipboard.writeText(tpl)
    useUiStore().toast('ok', '反馈模板已复制到剪贴板')
  } catch {
    useUiStore().toast('error', '复制失败，请手动记录问题')
  }
}
