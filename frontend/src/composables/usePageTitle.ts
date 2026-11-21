import { toValue, type MaybeRefOrGetter } from 'vue'
import { useHead } from '@unhead/vue'

/**
 * 页面 head（SEO §5/§6）：title + description 由 @unhead/vue 注入，
 * vite-ssg 构建期（SSR）即写入预渲染 HTML——每页唯一 h1/title 语义成立。
 * 兜底标题沿用站点默认，正文页应传入内容 frontmatter 的摘要。
 */
const SITE = 'cs-study'

export function usePageTitle(title: MaybeRefOrGetter<string>, description?: MaybeRefOrGetter<string>) {
  useHead({
    title: () => {
      const t = toValue(title)
      return t ? `${t} · ${SITE}` : 'cs-study · 计算机科学技术学习平台'
    },
    meta: [
      () => ({
        name: 'description',
        content: toValue(description) || '为 CS 初学者提供一张清晰的学习地图：技术领域 → 学习路线 → 课程内容 → 本地进度反馈。无需注册，进度仅存于你的浏览器。',
      }),
    ],
  })
}
