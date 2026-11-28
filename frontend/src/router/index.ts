import type { RouteRecordRaw } from 'vue-router'
import { contentApi } from '@/api'

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
    // 知识点正文按课程分片懒加载：进入页面前先载入所属课程分片，getLesson 才能同步可得
    //（vite-ssg 在 SSG 构建与客户端首帧都会先 await 路由就绪，预渲染/水合均不受影响）
    beforeEnter: [
      async (to) => {
        await contentApi.ensureCourseLessons(String(to.params.courseSlug))
      },
    ],
  },
  { path: '/profile', name: 'profile', component: () => import('@/pages/ProfilePage.vue') },
  { path: '/settings', name: 'settings', component: () => import('@/pages/SettingsPage.vue') },
  { path: '/plan', name: 'plan', component: () => import('@/pages/PlanPage.vue') },
  { path: '/daily', name: 'daily', component: () => import('@/pages/DailyPage.vue') },
  { path: '/search', name: 'search', component: () => import('@/pages/SearchPage.vue') },
  { path: '/quiz/:id', name: 'quiz', component: () => import('@/pages/QuizPage.vue') },
  { path: '/mistakes', name: 'mistakes', component: () => import('@/pages/MistakesPage.vue') },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
  },
]
