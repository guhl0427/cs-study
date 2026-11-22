import { toValue, type MaybeRefOrGetter } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'

/**
 * 页面 head 全套（SEO §6）：title / description / canonical / Open Graph / JSON-LD。
 * vite-ssg 构建期（SSR）即写入预渲染 HTML，客户端水合后继续接管。
 * 站点地址可由 VITE_SITE_URL 覆盖（CI 与本地一致时可不设）。
 */
export const SITE_URL =
  ((import.meta.env.VITE_SITE_URL as string | undefined) ?? 'https://guhl0427.github.io/cs-study').replace(/\/$/, '')

const SITE = 'cs-study'
const DEFAULT_DESC = '为 CS 初学者提供一张清晰的学习地图：技术领域 → 学习路线 → 课程内容 → 本地进度反馈。无需注册，进度仅存于你的浏览器。'

export function usePageTitle(
  title: MaybeRefOrGetter<string>,
  description?: MaybeRefOrGetter<string>,
  jsonLd?: Record<string, unknown>,
) {
  const route = useRoute()

  const fullTitle = () => {
    const t = toValue(title)
    return t ? `${t} · ${SITE}` : 'cs-study · 计算机科学技术学习平台'
  }
  const desc = () => toValue(description) || DEFAULT_DESC
  const url = () => `${SITE_URL}${route.path === '/' ? '/' : route.path}`

  useHead({
    title: fullTitle,
    link: () => [{ rel: 'canonical', href: url() }],
    meta: () => [
      { name: 'description', content: desc() },
      { property: 'og:title', content: fullTitle() },
      { property: 'og:description', content: desc() },
      { property: 'og:url', content: url() },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE },
      { name: 'twitter:card', content: 'summary' },
    ],
    ...(jsonLd
      ? { script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(jsonLd) }] }
      : {}),
  })
}
