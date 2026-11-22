import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// 纯 TS 单测（storage / stores / lib），不加载 Vue 插件链
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
