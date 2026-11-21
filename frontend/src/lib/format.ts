const pad = (n: number) => String(n).padStart(2, '0')

/** 本地时区的 YYYY-MM-DD（打卡日历的日期键） */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDate(iso: string): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

export function formatDateTime(iso: string): string {
  if (!iso) return '尚无'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 分钟数 → 人话：45 分钟 / 1 小时 30 分 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `约 ${bytes} B`
  return `约 ${Math.round(bytes / 1024)} KB`
}
