import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'
import App from './App.vue'
import { routes } from './router'
import './styles/main.css'

// 页面只通过 src/api/contracts.ts 访问内容与用户数据（需求 §6.3 服务适配层）
export const createApp = ViteSSG(
  App,
  { routes, base: '/' },
  ({ app }) => {
    app.use(createPinia())
  },
)
