import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export function formatDate(date: string | Date, format: string = 'YYYY-MM-DD HH:mm'): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 后端存的是 UTC 裸时间（datetime.utcnow().isoformat() 无时区标识），
// JS 直接 new Date() 会当本地时间解析导致差 8 小时；
// 对无时区的时间串补 Z 按 UTC 解析，再转本地时区展示（已带时区的 K8s/ISO 串不受影响）
// dateOnly=true 时仅展示日期（替代原 toLocaleDateString 用法）
export function formatTime(value: string | number | Date | null | undefined, dateOnly: boolean = false): string {
  if (value === null || value === undefined || value === '') return '-'
  let d: Date
  if (value instanceof Date) {
    d = value
  } else if (typeof value === 'number') {
    d = new Date(value)
  } else {
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
    d = new Date(hasTz ? value : value + 'Z')
  }
  if (isNaN(d.getTime())) return '-'
  return dateOnly ? d.toLocaleDateString('zh-CN') : d.toLocaleString('zh-CN')
}

// 按量计费记录描述里内嵌的计费区间时间，历史上由后端按 UTC 拼接（比北京时间差 8 小时）；
// 这里用结构化字段 period_start/period_end 按本地时区重拼区间替换内嵌时间，新旧数据都能正确展示
export function renderBillingDescription(
  description: string | null | undefined,
  periodStart?: string | null,
  periodEnd?: string | null,
): string {
  const desc = description || '-'
  if (!periodStart || !periodEnd) return desc
  const fmt = (v: string) => {
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(v)
    const d = new Date(hasTz ? v : v + 'Z')
    if (isNaN(d.getTime())) return ''
    const p = (n: number) => String(n).padStart(2, '0')
    return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  }
  const period = `${fmt(periodStart)}~${fmt(periodEnd)}`
  return desc.replace(/\d{2}\/\d{2} \d{2}:\d{2}~\d{2}\/\d{2} \d{2}:\d{2}/, period)
}
