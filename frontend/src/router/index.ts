import type { RouteRecordRaw } from 'vue-router'

// 静态路由 + 内容动态路由。动态路由的具体路径由
// tools/build-content.mjs 产出的 routes-manifest.json 在 vite.config.ts
// 中展开为预渲染清单（SSG），此处只登记模式。
export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/pages/HomePage.vue') },
  { path: '/explore', name: 'explore', component: () => import('@/pages/ExplorePage.vue') },
  { path: '/guide', name: 'guide', component: () => import('@/pages/GuidePage.vue') },
  { path: '/domain/:slug', name: 'domain', component: () => import('@/pages/DomainPage.vue') },
  { path: '/path/:slug', name: 'path', component: () => import('@/pages/PathPage.vue') },
  { path: '/course/:slug', name: 'course', component: () => import('@/pages/CoursePage.vue') },
  {
    path: '/course/:courseSlug/lesson/:lessonSlug',
    name: 'lesson',
    component: () => import('@/pages/LessonPage.vue'),
  },
  { path: '/profile', name: 'profile', component: () => import('@/pages/ProfilePage.vue') },
  { path: '/settings', name: 'settings', component: () => import('@/pages/SettingsPage.vue') },
  { path: '/search', name: 'search', component: () => import('@/pages/SearchPage.vue') },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
  },
]
