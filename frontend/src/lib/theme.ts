/** 主题切换（浅色默认；选择持久化于 localStorage，首帧由 index.html 内联脚本应用防闪烁） */
export type Theme = 'light' | 'dark'

const KEY = 'cs-study:theme'

export function currentTheme(): Theme {
  const saved = localStorage.getItem(KEY) as Theme | null
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(KEY, theme)
}

export function toggleTheme(): Theme {
  const next: Theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}
