import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import manifest from './src/content/gen/routes-manifest.json' with { type: 'json' }

// SSG 方案定案（M0）：vite-ssg —— 与需求 §6.2「SSG 优先」一致。
// `vite-ssg build` 读取 vite 配置中的 ssgOptions（vite-ssg 对 UserConfig 做了类型增强）；
// 动态内容路由由构建脚本产出的 routes-manifest.json 展开为预渲染清单。
export default defineConfig({
  // GitHub Pages 项目页部署时由 CI 注入 VITE_BASE=/cs-study/；本地开发默认 /
  base: process.env.VITE_BASE || '/',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  ssgOptions: {
    script: 'async',
    includedRoutes(paths, routes) {
      const expand = manifest as Record<string, string[]>
      const out: string[] = []
      for (const route of routes) {
        const key = String(route.name ?? '')
        if (expand[key]) {
          out.push(...expand[key])
        } else if (!route.path.includes(':')) {
          out.push(route.path)
        }
      }
      void paths
      return out
    },
  },
})
